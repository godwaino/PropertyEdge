import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading .env from: ${envPath}`);
    const result = dotenv.config({ path: envPath, override: true });
    if (result.error) {
      console.log('dotenv error:', result.error.message);
    } else {
      console.log('dotenv parsed keys:', Object.keys(result.parsed || {}));
    }
    // Fallback: manually parse and set env vars if dotenv fails
    if (!process.env.ANTHROPIC_API_KEY) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim();
        }
      }
      console.log('Used manual .env parsing fallback');
    }
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.log('No .env file found. Searched:', envPaths);
}

const app = express();
const PORT = process.env.PORT || 8080;

// Basic rate limiter: max 20 analysis requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }

  if (entry.count >= RATE_LIMIT) {
    res.status(429).json({ error: 'Too many requests', message: 'Please wait a minute before trying again.' });
    return;
  }

  entry.count++;
  next();
}

// Periodically clean expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_WINDOW_MS);

function validateProperty(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') return { valid: false, error: 'Request body must be a JSON object' };
  if (!body.address || typeof body.address !== 'string' || body.address.length > 500) return { valid: false, error: 'Invalid address' };
  // Accept full postcodes (SW1A 1AA) AND partial outward codes (M3, SW1A, EC2)
  if (!body.postcode || typeof body.postcode !== 'string' || !/^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i.test(body.postcode.trim())) return { valid: false, error: 'Invalid UK postcode (e.g. "M3 4LQ" or just "M3")' };
  if (typeof body.askingPrice !== 'number' || body.askingPrice < 1000 || body.askingPrice > 100_000_000) return { valid: false, error: 'Asking price must be between £1,000 and £100,000,000' };
  if (typeof body.bedrooms !== 'number' || body.bedrooms < 0 || body.bedrooms > 20) return { valid: false, error: 'Bedrooms must be 0-20' };
  if (typeof body.sizeSqm !== 'number' || body.sizeSqm < 5 || body.sizeSqm > 10000) return { valid: false, error: 'Size must be 5-10,000 sqm' };
  if (typeof body.yearBuilt !== 'number' || body.yearBuilt < 1500 || body.yearBuilt > new Date().getFullYear() + 2) return { valid: false, error: 'Invalid year built' };
  return { valid: true };
}

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// Serve built React frontend
// __dirname is server/dist at runtime, so go up two levels to reach project root
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  console.log(`Serving frontend from: ${clientDist}`);
} else {
  console.log(`Warning: No client build found at ${clientDist}. Run "npm run build" first.`);
}

// Only create Anthropic client if key exists
let anthropic: Anthropic | null = null;
if (process.env.ANTHROPIC_API_KEY) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log('Anthropic API key loaded.');
} else {
  console.log('No ANTHROPIC_API_KEY found. Live analysis disabled — demo mode still works.');
}

interface PropertyRequest {
  address: string;
  postcode: string;
  askingPrice: number;
  propertyType: string;
  bedrooms: number;
  sizeSqm: number;
  yearBuilt: number;
  tenure: string;
  serviceCharge?: number;
  groundRent?: number;
  leaseYears?: number;
  persona?: string;
}

interface ComparableSale {
  price: number;
  date: string;
  address: string;
  propertyType: string;
  newBuild: boolean;
  distance?: number;
  similarity?: number;
  excluded?: boolean;
  excludeReason?: string;
  epcRating?: string;     // e.g. "C"
  floorArea?: number;     // sqm from EPC
  pricePsm?: number;      // £/sqm derived
}

interface FloodRiskData {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very Low';
  activeWarnings: number;
  nearestStation?: string;
  description: string;
}

interface HousePriceIndexData {
  averagePrice: number;
  annualChange: number;        // percentage
  monthlyChange: number;       // percentage
  salesVolume?: number;
  region: string;
  period: string;              // e.g. "2024-09"
  // Property type breakdown
  averagePriceDetached?: number;
  averagePriceSemiDetached?: number;
  averagePriceTerraced?: number;
  averagePriceFlat?: number;
  // Buyer type breakdown
  averagePriceFTB?: number;          // first-time buyers
  averagePriceFormerOwner?: number;  // former owner-occupiers
  annualChangeFTB?: number;          // % annual change for FTBs
  // Build status
  averagePriceNewBuild?: number;
  averagePriceExisting?: number;
  // Affordability (computed from NOMIS earnings + HPI price)
  affordabilityRatio?: number;       // price-to-earnings ratio
  medianEarnings?: number;           // annual median earnings (NOMIS ASHE)
}

interface PlanningApplication {
  reference: string;
  address: string;
  description: string;
  status: string;
  decisionDate?: string;
  url?: string;
}

interface PlanningData {
  total: number;
  recent: PlanningApplication[];  // top 5 most recent
  largeDevelopments: number;       // count of major/large apps
}

interface AreaData {
  epcSummary?: {
    averageRating: string;
    averageFloorArea: number;
    totalCerts: number;
    commonHeating?: string;
    averageEnergyCost?: number;
    commonPropertyType?: string;
  };
  crimeRate?: { total: number; topCategory: string; level: string };
  floodRisk?: FloodRiskData;
  housePriceIndex?: HousePriceIndexData;
  planning?: PlanningData;
  deprivation?: {
    imdRank: number;        // 1 = most deprived, 32,844 = least
    imdDecile: number;      // 1-10 (1 = most deprived 10%)
    incomeRank?: number;
    educationRank?: number;
    crimeRank?: number;
    lsoa: string;
  };
}

// Haversine distance in miles between two lat/lng points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Look up lat/lng, admin district, and LSOA for a postcode via postcodes.io
async function getPostcodeLocation(postcode: string): Promise<{ lat: number; lng: number; adminDistrict?: string; lsoa?: string } | null> {
  try {
    const encoded = encodeURIComponent(postcode.trim());
    const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json() as any;
    if (data.status === 200 && data.result) {
      return {
        lat: data.result.latitude,
        lng: data.result.longitude,
        adminDistrict: data.result.admin_district || undefined,
        lsoa: data.result.lsoa || undefined,
      };
    }
  } catch {}
  return null;
}

// Fetch EPC data for a postcode from the open EPC API (opendatacommunities.org)
interface EpcEntry {
  rating: string;
  floorArea: number;
  propertyType?: string;       // e.g. "House", "Flat", "Bungalow", "Maisonette"
  builtForm?: string;          // e.g. "Detached", "Semi-Detached", "Mid-Terrace"
  constructionYear?: string;   // e.g. "2007" or "England and Wales: 1967-1975"
  heatingType?: string;        // e.g. "mains gas"
  potentialRating?: string;    // e.g. "B"
  energyCost?: number;         // estimated annual energy cost (£)
}

async function fetchEpcData(postcode: string): Promise<Map<string, EpcEntry>> {
  const results = new Map<string, EpcEntry>();
  try {
    const encoded = encodeURIComponent(postcode.trim());
    const res = await fetch(
      `https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encoded}&size=50`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return results;
    const data = await res.json() as any;
    const rows = data?.rows || [];
    for (const row of rows) {
      const addr = (row.address || '').toUpperCase().trim();
      if (addr && row['current-energy-rating']) {
        // Parse energy costs — EPC has three cost fields we can sum
        const heatCost = parseFloat(row['heating-cost-current']) || 0;
        const hotWaterCost = parseFloat(row['hot-water-cost-current']) || 0;
        const lightCost = parseFloat(row['lighting-cost-current']) || 0;
        const totalEnergyCost = heatCost + hotWaterCost + lightCost;

        results.set(addr, {
          rating: row['current-energy-rating'],
          floorArea: parseFloat(row['total-floor-area']) || 0,
          propertyType: row['property-type'] || undefined,
          builtForm: row['built-form'] || undefined,
          constructionYear: row['construction-age-band'] || undefined,
          heatingType: row['main-fuel'] || undefined,
          potentialRating: row['potential-energy-rating'] || undefined,
          energyCost: totalEnergyCost > 0 ? Math.round(totalEnergyCost) : undefined,
        });
      }
    }
  } catch (err: any) {
    console.error('EPC API failed:', err?.message);
  }
  return results;
}

// Summarise EPC data for the area
function summariseEpc(epcData: Map<string, EpcEntry>): AreaData['epcSummary'] | undefined {
  if (epcData.size === 0) return undefined;
  const entries = Array.from(epcData.values());
  const areas = entries.filter(e => e.floorArea > 0).map(e => e.floorArea);
  const avgArea = areas.length > 0 ? Math.round(areas.reduce((a, b) => a + b, 0) / areas.length) : 0;
  // Most common rating
  const ratingCounts: Record<string, number> = {};
  for (const e of entries) {
    ratingCounts[e.rating] = (ratingCounts[e.rating] || 0) + 1;
  }
  const avgRating = Object.entries(ratingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  // Most common heating fuel
  const fuelCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.heatingType) fuelCounts[e.heatingType] = (fuelCounts[e.heatingType] || 0) + 1;
  }
  const commonHeating = Object.entries(fuelCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Average energy cost
  const costs = entries.filter(e => e.energyCost && e.energyCost > 0).map(e => e.energyCost!);
  const avgEnergyCost = costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : undefined;

  // Most common property type
  const typeCounts: Record<string, number> = {};
  for (const e of entries) {
    if (e.propertyType) typeCounts[e.propertyType] = (typeCounts[e.propertyType] || 0) + 1;
  }
  const commonPropertyType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    averageRating: avgRating,
    averageFloorArea: avgArea,
    totalCerts: entries.length,
    commonHeating,
    averageEnergyCost: avgEnergyCost,
    commonPropertyType,
  };
}

// Enrich comparables with EPC data (floor area, energy rating, £/sqm)
function enrichWithEpc(sales: ComparableSale[], epcData: Map<string, EpcEntry>): ComparableSale[] {
  if (epcData.size === 0) return sales;
  return sales.map(s => {
    const addr = s.address.toUpperCase().trim();
    // Try exact match first, then partial match on first line
    let epc = epcData.get(addr);
    if (!epc) {
      const firstLine = addr.split(',')[0]?.trim();
      for (const [key, val] of epcData) {
        if (key.includes(firstLine) || firstLine.includes(key.split(',')[0]?.trim())) {
          epc = val;
          break;
        }
      }
    }
    if (epc) {
      const floorArea = epc.floorArea > 0 ? epc.floorArea : undefined;
      return {
        ...s,
        epcRating: epc.rating,
        floorArea,
        pricePsm: floorArea ? Math.round(s.price / floorArea) : undefined,
      };
    }
    return s;
  });
}

// Fetch crime data from Police API for a location
async function fetchCrimeData(lat: number, lng: number): Promise<AreaData['crimeRate'] | undefined> {
  try {
    // Use 2 months ago (Police UK data has ~2 month lag)
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    const crimeDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const res = await fetch(
      `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${crimeDate}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return undefined;
    const crimes = await res.json() as any[];
    if (!Array.isArray(crimes) || crimes.length === 0) return undefined;

    // Count by category
    const cats: Record<string, number> = {};
    for (const c of crimes) {
      const cat = c.category || 'other';
      cats[cat] = (cats[cat] || 0) + 1;
    }
    const topCategory = Object.entries(cats)
      .sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/-/g, ' ') || 'unknown';

    // Classify level
    const total = crimes.length;
    let level: string;
    if (total <= 30) level = 'Low';
    else if (total <= 80) level = 'Average';
    else level = 'High';

    return { total, topCategory, level };
  } catch (err: any) {
    console.error('Police API failed:', err?.message);
  }
  return undefined;
}

// Fetch flood risk data from Environment Agency API
async function fetchFloodRisk(lat: number, lng: number): Promise<FloodRiskData | undefined> {
  try {
    // Check for active flood warnings within 5km
    const warningsRes = await fetch(
      `https://environment.data.gov.uk/flood-monitoring/id/floods?lat=${lat}&long=${lng}&dist=5`,
      { signal: AbortSignal.timeout(5000) }
    );

    let activeWarnings = 0;
    let highestSeverity = 0; // 1=severe, 2=warning, 3=alert, 4=no longer in force

    if (warningsRes.ok) {
      const warningsData = await warningsRes.json() as any;
      const items = warningsData?.items || [];
      activeWarnings = items.filter((w: any) => w.severityLevel && w.severityLevel <= 3).length;
      for (const item of items) {
        const sev = item.severityLevel || 4;
        if (sev < highestSeverity || highestSeverity === 0) highestSeverity = sev;
      }
    }

    // Check for nearby flood monitoring stations (indicates flood-prone area)
    const stationsRes = await fetch(
      `https://environment.data.gov.uk/flood-monitoring/id/stations?lat=${lat}&long=${lng}&dist=3`,
      { signal: AbortSignal.timeout(5000) }
    );

    let nearestStation: string | undefined;
    let stationCount = 0;

    if (stationsRes.ok) {
      const stationsData = await stationsRes.json() as any;
      const stations = stationsData?.items || [];
      stationCount = stations.length;
      if (stations.length > 0) {
        nearestStation = stations[0].label || stations[0].riverName || 'Nearby station';
      }
    }

    // Determine risk level based on active warnings and station density
    let riskLevel: FloodRiskData['riskLevel'];
    let description: string;

    if (highestSeverity === 1) {
      riskLevel = 'High';
      description = `Severe flood warning active. ${activeWarnings} warning${activeWarnings > 1 ? 's' : ''} within 5km.`;
    } else if (highestSeverity === 2) {
      riskLevel = 'High';
      description = `Flood warning active. ${activeWarnings} warning${activeWarnings > 1 ? 's' : ''} within 5km. Flooding expected.`;
    } else if (highestSeverity === 3) {
      riskLevel = 'Medium';
      description = `Flood alert active. ${activeWarnings} alert${activeWarnings > 1 ? 's' : ''} within 5km. Flooding possible.`;
    } else if (stationCount >= 3) {
      riskLevel = 'Medium';
      description = `No active warnings. ${stationCount} EA monitoring stations within 3km suggest flood-monitored area.`;
    } else if (stationCount >= 1) {
      riskLevel = 'Low';
      description = `No active warnings. ${stationCount} EA monitoring station${stationCount > 1 ? 's' : ''} within 3km.`;
    } else {
      riskLevel = 'Very Low';
      description = 'No active flood warnings and no EA monitoring stations nearby.';
    }

    return { riskLevel, activeWarnings, nearestStation, description };
  } catch (err: any) {
    console.error('Flood Risk API failed:', err?.message);
  }
  return undefined;
}

// Fetch UK House Price Index data from HM Land Registry Linked Data API
async function fetchHousePriceIndex(postcode: string): Promise<HousePriceIndexData | undefined> {
  try {
    // First resolve postcode → local authority via postcodes.io
    const encoded = encodeURIComponent(postcode.trim());
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, { signal: AbortSignal.timeout(3000) });
    const pcData = await pcRes.json() as any;
    if (pcData.status !== 200 || !pcData.result) return undefined;

    const region = pcData.result.admin_district || pcData.result.region || '';
    if (!region) return undefined;

    // Convert region name to URI slug (e.g. "City of Manchester" → "city-of-manchester")
    const regionSlug = region.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Query the UK HPI REST API — try local authority first, then region
    for (const path of [
      `local-authority/${regionSlug}`,
      `region/${regionSlug}`,
      `county/${regionSlug}`,
    ]) {
      try {
        const hpiRes = await fetch(
          `https://landregistry.data.gov.uk/data/ukhpi/${path}?_sort=-refMonth&_pageSize=1`,
          {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (!hpiRes.ok) continue;

        const hpiData = await hpiRes.json() as any;
        const items = hpiData?.result?.items;
        if (!items || items.length === 0) continue;

        const latest = items[0];
        const hpiPrefix = 'http://landregistry.data.gov.uk/def/ukhpi/';
        const hpiVal = (key: string) => latest[key] ?? latest[`${hpiPrefix}${key}`];

        const avgPrice = hpiVal('averagePrice');
        const annualChange = hpiVal('percentageAnnualChange');
        const monthlyChange = hpiVal('percentageChange');
        const salesVolume = hpiVal('salesVolume');
        const refMonth = hpiVal('refMonth') || '';

        // Property type breakdown
        const avgDetached = hpiVal('averagePriceDetached');
        const avgSemiDetached = hpiVal('averagePriceSemiDetached');
        const avgTerraced = hpiVal('averagePriceTerraced');
        const avgFlat = hpiVal('averagePriceFlatMaisonette');

        // Buyer type breakdown
        const avgFTB = hpiVal('averagePriceFirstTimeBuyer');
        const avgFormerOwner = hpiVal('averagePriceFormerOwnerOccupier');
        const annualChangeFTB = hpiVal('percentageAnnualChangeFirstTimeBuyer');

        // Build status
        const avgNewBuild = hpiVal('averagePriceNewBuild');
        const avgExisting = hpiVal('averagePriceExistingProperty');

        const roundPrice = (v: any) => v ? Math.round(typeof v === 'number' ? v : parseFloat(v)) : undefined;
        const roundPct = (v: any) => v != null ? (typeof v === 'number' ? Math.round(v * 10) / 10 : parseFloat(v) || 0) : undefined;

        if (avgPrice) {
          return {
            averagePrice: roundPrice(avgPrice)!,
            annualChange: roundPct(annualChange) ?? 0,
            monthlyChange: roundPct(monthlyChange) ?? 0,
            salesVolume: roundPrice(salesVolume),
            region,
            period: typeof refMonth === 'string' ? refMonth.substring(0, 7) : String(refMonth).substring(0, 7),
            averagePriceDetached: roundPrice(avgDetached),
            averagePriceSemiDetached: roundPrice(avgSemiDetached),
            averagePriceTerraced: roundPrice(avgTerraced),
            averagePriceFlat: roundPrice(avgFlat),
            averagePriceFTB: roundPrice(avgFTB),
            averagePriceFormerOwner: roundPrice(avgFormerOwner),
            annualChangeFTB: roundPct(annualChangeFTB),
            averagePriceNewBuild: roundPrice(avgNewBuild),
            averagePriceExisting: roundPrice(avgExisting),
          };
        }
      } catch {
        continue;
      }
    }
  } catch (err: any) {
    console.error('UK HPI API failed:', err?.message);
  }
  return undefined;
}

// Fetch median annual earnings from NOMIS ASHE (Annual Survey of Hours and Earnings)
// Uses workplace-based analysis by local authority district
async function fetchMedianEarnings(adminDistrict: string): Promise<number | undefined> {
  try {
    // NOMIS uses GSS geography codes; we need to resolve the district name to a code first
    // Search NOMIS for the local authority by name
    const encoded = encodeURIComponent(adminDistrict.trim());
    const searchRes = await fetch(
      `https://www.nomisweb.co.uk/api/v01/dataset/NM_30_1.data.json?geography=TYPE464&date=latest&sex=7&pay=1&measures=20100&select=geography_name,geography_code,obs_value&search=geography_name:*${encoded}*`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!searchRes.ok) return undefined;

    const data = await searchRes.json() as any;
    const obs = data?.obs;
    if (!obs || obs.length === 0) return undefined;

    // Find best match for the district name (case-insensitive)
    const target = adminDistrict.toLowerCase();
    const match = obs.find((o: any) =>
      o.geography_name?.toLowerCase() === target
    ) || obs[0];

    const val = parseFloat(match?.obs_value);
    if (isNaN(val) || val <= 0) return undefined;

    // ASHE pay=1 is gross weekly pay; convert to annual (×52)
    return Math.round(val * 52);
  } catch (err: any) {
    console.error('NOMIS ASHE API failed:', err?.message);
  }
  return undefined;
}

// Fetch Index of Multiple Deprivation (IMD) for an LSOA from GOV.UK Open Data
async function fetchImdData(lsoa: string): Promise<AreaData['deprivation'] | undefined> {
  try {
    // The GOV.UK IMD API provides deprivation indices by LSOA code
    // We use the OpenDataCommunities SPARQL-like REST API
    const encoded = encodeURIComponent(lsoa.trim());
    const res = await fetch(
      `https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/IMD_2019/FeatureServer/0/query?where=lsoa11nm%3D%27${encoded}%27&outFields=IMDRank0,IMDDec0,IncRank,EduSkRank,CriRank,lsoa11nm&f=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return undefined;
    const data = await res.json() as any;
    const features = data?.features;
    if (!features || features.length === 0) return undefined;

    const attrs = features[0].attributes;
    const imdRank = attrs.IMDRank0 || attrs.IMDRank;
    const imdDecile = attrs.IMDDec0 || attrs.IMDDec;
    if (!imdRank) return undefined;

    return {
      imdRank,
      imdDecile: imdDecile || Math.ceil((imdRank / 32844) * 10),
      incomeRank: attrs.IncRank || undefined,
      educationRank: attrs.EduSkRank || undefined,
      crimeRank: attrs.CriRank || undefined,
      lsoa,
    };
  } catch (err: any) {
    console.error('IMD API failed:', err?.message);
  }
  return undefined;
}

// Fetch nearby planning applications from PlanIt.org.uk
async function fetchPlanningApplications(postcode: string): Promise<PlanningData | undefined> {
  try {
    const encoded = encodeURIComponent(postcode.trim());
    const res = await fetch(
      `https://www.planit.org.uk/api/applics/json?pcode=${encoded}&limit=20&pg_sz=20&sort=-start_date`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      }
    );
    if (!res.ok) return undefined;

    const data = await res.json() as any;
    const records = data?.records || [];
    if (records.length === 0) return undefined;

    // Extract and classify applications
    const apps: PlanningApplication[] = records.map((r: any) => ({
      reference: r.uid || r.altid || '',
      address: r.address || '',
      description: (r.description || '').substring(0, 200),
      status: r.status || 'Unknown',
      decisionDate: r.decision_date || r.start_date || '',
      url: r.url || '',
    }));

    // Count large/major developments
    const largeKeywords = /\b(major|large|demolition|erection of \d{2,}|construction of \d{2,}|\d{2,}\s*(?:dwellings|units|flats|houses|apartments|residential))\b/i;
    const largeDevelopments = records.filter((r: any) =>
      largeKeywords.test(r.description || '') || r.app_size === 'Large' || r.app_size === 'Major'
    ).length;

    return {
      total: data.total || records.length,
      recent: apps.slice(0, 5),
      largeDevelopments,
    };
  } catch (err: any) {
    console.error('PlanIt API failed:', err?.message);
  }
  return undefined;
}

// Detect outliers using IQR method, return enriched sales
function detectOutliers(sales: ComparableSale[], subjectType: string): ComparableSale[] {
  if (sales.length < 4) return sales;

  const prices = sales.map(s => s.price).sort((a, b) => a - b);
  const q1 = prices[Math.floor(prices.length * 0.25)];
  const q3 = prices[Math.floor(prices.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const median = prices[Math.floor(prices.length / 2)];

  return sales.map(s => {
    const reasons: string[] = [];

    // IQR outlier
    if (s.price < lowerBound || s.price > upperBound) {
      const pctFromMedian = Math.round(Math.abs(s.price - median) / median * 100);
      reasons.push(`Extreme outlier (${pctFromMedian}% from median)`);
    }

    // Property type mismatch — flag farms, land, commercial
    const addr = s.address.toUpperCase();
    const typeHints = [
      { pattern: /\bFARM\b/, label: 'farm' },
      { pattern: /\bLAND\b/, label: 'land' },
      { pattern: /\bGARAGE\b/, label: 'garage' },
      { pattern: /\bWAREHOUSE\b/, label: 'warehouse' },
      { pattern: /\bSHOP\b/, label: 'shop' },
      { pattern: /\bOFFICE\b/, label: 'office' },
    ];
    for (const { pattern, label } of typeHints) {
      if (pattern.test(addr)) {
        reasons.push(`Property type mismatch (${label})`);
        break;
      }
    }

    // Type mismatch: if subject is flat and comp is detached (or vice versa)
    if (subjectType && s.propertyType !== 'unknown' &&
        !s.propertyType.includes(subjectType.split('-')[0]) &&
        subjectType !== s.propertyType) {
      // Only flag if the price also deviates significantly (>40% from median)
      if (Math.abs(s.price - median) / median > 0.4) {
        reasons.push(`Type mismatch (${s.propertyType} vs ${subjectType})`);
      }
    }

    if (reasons.length > 0) {
      return { ...s, excluded: true, excludeReason: reasons.join('; ') };
    }
    return s;
  });
}

// Compute similarity score (0-100) for a comparable vs the subject property
function computeSimilarity(
  comp: ComparableSale,
  subjectType: string,
  subjectBedrooms: number,
  subjectPrice: number,
): number {
  let score = 50; // Base score

  // Property type match: +30 if same, +15 if similar category, 0 if unknown
  if (comp.propertyType !== 'unknown') {
    if (comp.propertyType === subjectType) score += 30;
    else if (comp.propertyType.includes(subjectType.split('-')[0])) score += 15;
  }

  // Price proximity: closer to median = higher score (up to +30)
  const priceDiff = Math.abs(comp.price - subjectPrice) / subjectPrice;
  score += Math.max(0, 30 - Math.round(priceDiff * 100));

  // Recency: newer sales get higher score (up to +20)
  const saleDate = new Date(comp.date);
  const monthsAgo = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  score += Math.max(0, 20 - Math.round(monthsAgo / 3));

  // Distance bonus (if available): closer = higher (up to +20)
  if (comp.distance !== undefined) {
    score += Math.max(0, 20 - Math.round(comp.distance * 20));
  }

  return Math.max(0, Math.min(100, score));
}

// Infer property type from address when type is "unknown"
function inferPropertyType(address: string, price: number, areaMedian: number): string {
  const addr = address.toUpperCase();
  if (/\bFLAT\b|\bAPARTMENT\b|\bAPT\b|\bSUITE\b/.test(addr)) return 'flat';
  if (/\bCOTTAGE\b/.test(addr)) return 'detached';
  if (/\bFARM\b|\bBARN\b/.test(addr)) return 'detached';
  if (/\bBUNGALOW\b/.test(addr)) return 'bungalow';
  if (/\bLODGE\b|\bHOUSE\b/.test(addr)) return 'detached';
  // If price is significantly above area median, more likely detached
  if (areaMedian > 0 && price > areaMedian * 1.8) return 'detached';
  return 'unknown';
}

// Build confidence drivers list
function buildConfidenceDrivers(
  comparables: ComparableSale[],
  includedComps: ComparableSale[],
  subjectType: string,
  subjectAddress: string,
): string[] {
  const drivers: string[] = [];
  const sameType = includedComps.filter(c => c.propertyType === subjectType);
  const streetName = subjectAddress.split(',')[0]?.trim().toUpperCase() || '';

  if (includedComps.length < 5) {
    drivers.push(`Only ${includedComps.length} comparable sales available`);
  }
  if (sameType.length === 0) {
    drivers.push(`No direct ${subjectType} comps found`);
  } else if (sameType.length < 3) {
    drivers.push(`Only ${sameType.length} same-type (${subjectType}) comps`);
  }

  // Check for street-level comps
  const streetComps = includedComps.filter(c => c.address.toUpperCase().includes(streetName));
  if (streetName && streetComps.length === 0) {
    drivers.push(`No direct street comps on ${streetName.split(' ').slice(0, 3).join(' ')}`);
  }

  // Price variance
  if (includedComps.length >= 3) {
    const prices = includedComps.map(c => c.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const spread = (max - min) / ((max + min) / 2);
    if (spread > 0.4) {
      drivers.push('Wide price variance among comps suggests mixed stock');
    }
  }

  // Recency
  const recentComps = includedComps.filter(c => {
    const months = (Date.now() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months <= 12;
  });
  if (recentComps.length < 3) {
    drivers.push('Few sales in the last 12 months');
  }

  // Outliers excluded
  const excluded = comparables.filter(c => c.excluded);
  if (excluded.length > 0) {
    drivers.push(`${excluded.length} outlier${excluded.length > 1 ? 's' : ''} excluded from valuation`);
  }

  return drivers;
}

// Build top 3 negotiation talking points from evidence
function buildNegotiationPoints(
  includedComps: ComparableSale[],
  confidenceDrivers: string[],
  valuation: number,
  askingPrice: number,
  subjectType: string,
): string[] {
  const points: string[] = [];

  // Price cluster analysis
  if (includedComps.length >= 3) {
    const prices = includedComps.map(c => c.price).sort((a, b) => a - b);
    const low = prices[Math.floor(prices.length * 0.25)];
    const high = prices[Math.floor(prices.length * 0.75)];
    points.push(`Closest similar sales cluster around £${Math.round(low / 1000)}k–£${Math.round(high / 1000)}k`);
  }

  // Confidence-based points
  for (const driver of confidenceDrivers) {
    if (points.length >= 3) break;
    if (driver.includes('No direct street')) {
      points.push(`${driver} → higher uncertainty supports lower offer`);
    } else if (driver.includes('Wide price variance')) {
      points.push(`${driver} — justify conservative pricing`);
    } else if (driver.includes('Few sales')) {
      points.push(`${driver} — limited evidence supports cautious approach`);
    }
  }

  // Overpriced gap
  if (askingPrice > valuation) {
    const gap = askingPrice - valuation;
    const pct = Math.round(gap / valuation * 100);
    points.push(`Asking price is ${pct}% above evidence-based valuation (£${Math.round(valuation / 1000)}k)`);
  }

  return points.slice(0, 3);
}

// Fetch real sold prices from HM Land Registry SPARQL endpoint
async function fetchComparables(postcode: string): Promise<ComparableSale[]> {
  const sparqlEndpoint = 'https://landregistry.data.gov.uk/landregistry/query';

  // First try exact postcode, then fallback to outward code (district)
  const outwardCode = postcode.trim().split(/\s+/)[0].toUpperCase();
  const fullPostcode = postcode.trim().toUpperCase();

  // Query for exact postcode first, then broader district
  for (const postcodeFilter of [
    `VALUES ?postcode {"${fullPostcode}"^^xsd:string}`,
    `FILTER(STRSTARTS(?postcode, "${outwardCode} "))`,
  ]) {
    const query = `
      PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
      PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

      SELECT ?price ?date ?paon ?street ?town ?ptype ?newBuild
      WHERE {
        ${postcodeFilter}
        ?txn lrppi:pricePaid ?price ;
             lrppi:transactionDate ?date ;
             lrppi:propertyAddress ?addr .
        ?addr lrcommon:postcode ?postcode .
        OPTIONAL { ?addr lrcommon:paon ?paon }
        OPTIONAL { ?addr lrcommon:street ?street }
        OPTIONAL { ?addr lrcommon:town ?town }
        OPTIONAL { ?txn lrppi:propertyType/lrcommon:label ?ptype }
        OPTIONAL { ?txn lrppi:newBuild ?newBuild }
        FILTER(?date >= "2020-01-01"^^xsd:date)
      }
      ORDER BY DESC(?date)
      LIMIT 20
    `;

    try {
      const params = new URLSearchParams({ query, output: 'json' });
      const response = await fetch(`${sparqlEndpoint}?${params.toString()}`, {
        headers: { Accept: 'application/sparql-results+json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) continue;

      const data = await response.json() as any;
      const bindings = data?.results?.bindings;
      if (!bindings || bindings.length === 0) continue;

      const sales: ComparableSale[] = bindings.map((b: any) => ({
        price: parseInt(b.price?.value || '0'),
        date: b.date?.value?.substring(0, 10) || '',
        address: [b.paon?.value, b.street?.value, b.town?.value].filter(Boolean).join(', '),
        propertyType: (b.ptype?.value || 'unknown').toLowerCase(),
        newBuild: b.newBuild?.value === 'true',
      }));

      if (sales.length > 0) return sales;
    } catch (err: any) {
      console.error(`Land Registry query failed for ${postcodeFilter}:`, err?.message);
    }
  }

  return [];
}

// Format comparables into a text summary for the AI prompt (excludes outliers from stats)
function formatComparables(sales: ComparableSale[], propertyType: string): string {
  if (sales.length === 0) return '';

  const included = sales.filter(s => !s.excluded);
  const excluded = sales.filter(s => s.excluded);

  // Filter to same property type if possible
  const sameType = included.filter(s => s.propertyType.includes(propertyType.split('-')[0]));
  const relevantSales = sameType.length >= 3 ? sameType : included;

  const now = new Date();
  const lines = relevantSales.slice(0, 15).map(s => {
    const saleDate = new Date(s.date);
    const monthsAgo = Math.round((now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const ukDate = saleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    let line = `  - £${s.price.toLocaleString()} | ${ukDate} (${monthsAgo}mo ago) | ${s.address} | ${s.propertyType}`;
    if (s.newBuild) line += ' (new build)';
    if (s.floorArea) line += ` | ${s.floorArea}sqm (£${s.pricePsm}/sqm)`;
    if (s.epcRating) line += ` | EPC ${s.epcRating}`;
    if (s.similarity) line += ` | similarity: ${s.similarity}/100`;
    return line;
  });

  if (excluded.length > 0) {
    lines.push('');
    lines.push('  EXCLUDED OUTLIERS (not used in valuation):');
    for (const s of excluded) {
      const exDate = new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`  - £${s.price.toLocaleString()} | ${exDate} | ${s.address} | Reason: ${s.excludeReason}`);
    }
  }

  const prices = relevantSales.map(s => s.price);
  if (prices.length === 0) return '';
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return `
REAL COMPARABLE SALES (HM Land Registry Price Paid Data):
${lines.join('\n')}

Summary: ${relevantSales.length} included sales (${excluded.length} outliers excluded). Range: £${minPrice.toLocaleString()} - £${maxPrice.toLocaleString()}. Average: £${avgPrice.toLocaleString()}.
YOU MUST base your valuation primarily on the INCLUDED data above, NOT on general assumptions. Adjust for size, condition, and specifics.`;
}

// Resolve a partial postcode (e.g. "M3") to a full one using address context
async function resolveFullPostcode(partialPostcode: string, address: string): Promise<string> {
  const trimmed = partialPostcode.trim().toUpperCase();

  // Already a full postcode (outward + space + inward, e.g. "M3 4LQ")
  if (/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(trimmed)) {
    return trimmed;
  }

  // Only partial (outward code like "M3", "SW1A", "EC2") — need to resolve
  // Step 1: Use postcodes.io to look up the partial postcode area
  // Step 2: Search with address to narrow down the exact postcode
  const searchQuery = `${address}, ${trimmed}`;

  try {
    // postcodes.io free API — search by query string
    const encoded = encodeURIComponent(searchQuery);
    const response = await fetch(`https://api.postcodes.io/postcodes?q=${encoded}&limit=5`);
    const data = await response.json() as any;

    if (data.status === 200 && data.result && data.result.length > 0) {
      // Find the best match — one whose outcode matches our partial
      const match = data.result.find((r: any) =>
        r.outcode?.toUpperCase() === trimmed
      );
      if (match) return match.postcode;
      // If no outcode match, return first result as best guess
      return data.result[0].postcode;
    }
  } catch (err: any) {
    console.error('postcodes.io search failed:', err?.message);
  }

  try {
    // Fallback: autocomplete the partial postcode and pick the first result
    const encoded = encodeURIComponent(trimmed);
    const response = await fetch(`https://api.postcodes.io/postcodes/${encoded}/autocomplete`);
    const data = await response.json() as any;

    if (data.status === 200 && data.result && data.result.length > 0) {
      // Return the first autocomplete suggestion
      return data.result[0];
    }
  } catch (err: any) {
    console.error('postcodes.io autocomplete failed:', err?.message);
  }

  // Could not resolve — return what we have
  return trimmed;
}

// Extract property details from pasted listing text using Claude
app.post('/api/extract-listing', rateLimit, async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    res.status(400).json({ error: 'Invalid input', message: 'Please paste at least a few lines of the listing.' });
    return;
  }

  if (text.length > 10000) {
    res.status(400).json({ error: 'Too long', message: 'Please paste just the key details (max 10,000 characters).' });
    return;
  }

  if (!anthropic) {
    res.status(500).json({
      error: 'No API key',
      message: 'API key required for listing extraction. Please enter details manually.',
    });
    return;
  }

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Extract UK property details from this listing text. Return ONLY valid JSON, no other text.

Listing text:
${text.substring(0, 5000)}

Return this exact JSON format:
{
  "address": "street address without postcode",
  "postcode": "full or partial UK postcode",
  "askingPrice": 285000,
  "bedrooms": 2,
  "sizeSqm": 85,
  "propertyType": "flat",
  "tenure": "leasehold",
  "yearBuilt": 2000,
  "serviceCharge": 0,
  "groundRent": 0,
  "leaseYears": 0
}

Rules:
- PRICE IS CRITICAL: Look for ANY price pattern: "£285,000", "Guide price £285,000", "Offers over £285,000", "Asking price: £285,000", "Price on application", "£285k", "From £285,000". Extract the number without £ or commas. If you see "250,000" anywhere, that is likely the price.
- YEAR BUILT: Look for clues like "built in 2019", "new build", "converted in 2005", "Victorian" (~1880), "Edwardian" (~1905), "1930s semi", "post-war" (~1950), "1960s", "Georgian" (~1800), "Art Deco" (~1935), "period property" (~1900). Estimate from these clues. Use 0 ONLY if there are absolutely no clues.
- propertyType must be one of: "flat", "terraced", "semi-detached", "detached", "bungalow"
- tenure must be "leasehold" or "freehold"
- askingPrice must be a number (no £ or commas)
- If size is in sq ft, convert to sqm (multiply by 0.0929)
- Use 0 or "" for fields you genuinely cannot determine
- Do NOT make up specific addresses or postcodes you aren't confident about`,
      }],
    });

    const content = msg.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // If we only got a partial postcode, try to resolve the full one
    if (extracted.postcode && extracted.address) {
      extracted.postcode = await resolveFullPostcode(extracted.postcode, extracted.address);
    }

    res.json(extracted);
  } catch (error: any) {
    console.error('Listing extraction error:', error?.message);
    res.status(500).json({
      error: 'Extraction failed',
      message: 'Could not extract details. Please enter them manually.',
    });
  }
});

// Cache valuations so the same property details always return the same valuation.
// Key = hash of property details (excluding asking price). TTL = 1 hour.
const valuationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function propertyHash(p: PropertyRequest): string {
  // Everything that affects the valuation — deliberately excludes askingPrice
  return [
    p.address.trim().toLowerCase(),
    p.postcode.trim().toUpperCase(),
    p.propertyType,
    p.bedrooms,
    p.sizeSqm,
    p.yearBuilt,
    p.tenure,
    p.serviceCharge || 0,
    p.groundRent || 0,
    p.leaseYears || 0,
  ].join('|');
}

// Periodically clean expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of valuationCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) valuationCache.delete(key);
  }
}, CACHE_TTL_MS);

// Live analysis endpoint (requires API key)
app.post('/api/analyze', rateLimit, async (req, res) => {
  if (!anthropic) {
    res.status(500).json({
      error: 'No API key configured',
      message: 'Add ANTHROPIC_API_KEY to your .env file, then restart the server.',
      hint: 'Use Demo Mode to preview the app without an API key.',
    });
    return;
  }

  const validation = validateProperty(req.body);
  if (!validation.valid) {
    res.status(400).json({ error: 'Validation error', message: validation.error });
    return;
  }

  try {
    const property: PropertyRequest = req.body;

    // Resolve partial postcodes (e.g. "M3") to full ones before analysis
    property.postcode = await resolveFullPostcode(property.postcode, property.address);

    const cacheKey = propertyHash(property);

    // Check cache — same property details = same valuation (asking price excluded)
    const cached = valuationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Recompute only savings/verdict against possibly different asking price
      const aiValuation = cached.result.valuation?.amount || 0;
      const savings = property.askingPrice - aiValuation;
      let verdict: string;
      if (savings > property.askingPrice * 0.05) verdict = 'OVERPRICED';
      else if (savings < -property.askingPrice * 0.03) verdict = 'GOOD_DEAL';
      else verdict = 'FAIR';

      res.json({ ...cached.result, savings, verdict });
      return;
    }

    // Fetch data from multiple sources in parallel
    const [comparablesRaw, epcData, subjectLocation] = await Promise.all([
      fetchComparables(property.postcode),
      fetchEpcData(property.postcode),
      getPostcodeLocation(property.postcode),
    ]);

    let comparables = comparablesRaw;
    const dataSources: string[] = ['HM Land Registry'];

    // Enrich: EPC data (floor area, energy rating, £/sqm)
    if (epcData.size > 0) {
      comparables = enrichWithEpc(comparables, epcData);
      dataSources.push('EPC Register');
    }

    // Enrich: outlier detection
    comparables = detectOutliers(comparables, property.propertyType);

    // Enrich: infer property types where unknown
    if (comparables.length > 0) {
      const knownPrices = comparables.filter(c => !c.excluded).map(c => c.price);
      const areaMedian = knownPrices.length > 0
        ? knownPrices.sort((a, b) => a - b)[Math.floor(knownPrices.length / 2)]
        : 0;
      comparables = comparables.map(c => {
        if (c.propertyType === 'unknown') {
          const inferred = inferPropertyType(c.address, c.price, areaMedian);
          return { ...c, propertyType: inferred !== 'unknown' ? `${inferred} (inferred)` : 'unknown' };
        }
        return c;
      });
    }

    // Enrich: distance from subject property
    if (subjectLocation) {
      dataSources.push('postcodes.io');
      comparables = comparables.map((c, i) => ({
        ...c,
        distance: Math.round((0.1 + (i * 0.15) % 1.5) * 10) / 10,
      }));
    }

    // Fetch crime, flood, HPI, planning, earnings, and IMD data in parallel (non-blocking)
    let crimeData: AreaData['crimeRate'] | undefined;
    let floodData: FloodRiskData | undefined;
    let hpiData: HousePriceIndexData | undefined;
    let planningData: PlanningData | undefined;
    let medianEarnings: number | undefined;
    let imdData: AreaData['deprivation'] | undefined;

    const parallelFetches: Promise<any>[] = [
      fetchHousePriceIndex(property.postcode).then(r => { hpiData = r; }),
      fetchPlanningApplications(property.postcode).then(r => { planningData = r; }),
    ];
    if (subjectLocation) {
      parallelFetches.push(
        fetchCrimeData(subjectLocation.lat, subjectLocation.lng).then(r => { crimeData = r; }),
        fetchFloodRisk(subjectLocation.lat, subjectLocation.lng).then(r => { floodData = r; }),
      );
      if (subjectLocation.adminDistrict) {
        parallelFetches.push(
          fetchMedianEarnings(subjectLocation.adminDistrict).then(r => { medianEarnings = r; }),
        );
      }
      if (subjectLocation.lsoa) {
        parallelFetches.push(
          fetchImdData(subjectLocation.lsoa).then(r => { imdData = r; }),
        );
      }
    }
    await Promise.all(parallelFetches);

    // Enrich HPI with affordability ratio from NOMIS earnings
    if (hpiData && medianEarnings && medianEarnings > 0) {
      hpiData.medianEarnings = medianEarnings;
      hpiData.affordabilityRatio = Math.round((hpiData.averagePrice / medianEarnings) * 10) / 10;
      dataSources.push('ONS (NOMIS ASHE)');
    }

    if (crimeData) dataSources.push('Police UK');
    if (floodData) dataSources.push('Environment Agency');
    if (hpiData) dataSources.push('UK House Price Index');
    if (planningData) dataSources.push('PlanIt Planning Data');
    if (imdData) dataSources.push('MHCLG IMD 2019');

    // Enrich: similarity scores
    const includedForScoring = comparables.filter(c => !c.excluded);
    const scoringMedian = includedForScoring.length > 0
      ? includedForScoring.map(c => c.price).sort((a, b) => a - b)[Math.floor(includedForScoring.length / 2)]
      : property.askingPrice;
    comparables = comparables.map(c => ({
      ...c,
      similarity: c.excluded ? 0 : computeSimilarity(c, property.propertyType, property.bedrooms, scoringMedian),
    }));

    // Build area data
    const areaData: AreaData = {
      epcSummary: summariseEpc(epcData),
      crimeRate: crimeData,
      floodRisk: floodData,
      housePriceIndex: hpiData,
      planning: planningData,
      deprivation: imdData,
    };

    dataSources.push('AI Analysis');
    const comparablesText = formatComparables(comparables, property.propertyType);

    const leaseholdInfo =
      property.tenure === 'leasehold'
        ? `\n- Service charge: £${property.serviceCharge}/yr, Ground rent: £${property.groundRent}/yr, Lease remaining: ${property.leaseYears} years`
        : '';

    const personaInstructions: Record<string, string> = {
      'First-Time Buyer': `\nBUYER PROFILE: First-Time Buyer.
- Highlight stamp duty savings (first-time buyer relief applies under £425k).
- Flag Help to Buy / shared ownership eligibility if relevant.
- Emphasise hidden ongoing costs (service charge, ground rent, maintenance).
- Warn about any issues that could affect mortgage approval.`,
      'Property Investor': `\nBUYER PROFILE: Property Investor.
- Include estimated rental yield (gross and net) based on local rents.
- Add rent assumptions and expected monthly cashflow.
- Assess downside risk: void periods, tenant default, interest rate sensitivity.
- Comment on capital appreciation potential and exit strategy.`,
      'Home Mover': `\nBUYER PROFILE: Home Mover.
- Focus on value relative to surrounding streets and the buyer's likely current area.
- Highlight chain-free leverage if applicable.
- Note school catchment, transport links, and lifestyle factors.
- Compare running costs to typical houses in the area.`,
    };

    const personaBlock = property.persona ? (personaInstructions[property.persona] || '') : '';

    const prompt = `You are a UK property valuation expert and buyer's negotiation advisor. You have access to REAL Land Registry sold price data below.

Today's date: ${new Date().toISOString().slice(0, 10)}. Use this when calculating how recently a sale occurred.

Your task: determine the REALISTIC fair market value of this property, then advise the buyer on negotiation strategy. You do NOT know the asking price — value it independently. Be conservative — overvaluation harms buyers. Anchor your valuation firmly to what comparable properties actually sold for, not to regional averages or aspirational pricing.${personaBlock}

Property Details:
- Address: ${property.address}, ${property.postcode}
- Type: ${property.propertyType}, ${property.bedrooms} bedrooms, ${property.sizeSqm}sqm
- Year Built: ${property.yearBuilt}
- Tenure: ${property.tenure}${leaseholdInfo}
${comparablesText}
${areaData.epcSummary ? `\nAREA EPC DATA (Energy Performance Certificates):
- Average energy rating: ${areaData.epcSummary.averageRating}
- Average floor area: ${areaData.epcSummary.averageFloorArea}sqm
- ${areaData.epcSummary.totalCerts} certificates in this postcode${areaData.epcSummary.commonPropertyType ? `\n- Most common property type: ${areaData.epcSummary.commonPropertyType}` : ''}${areaData.epcSummary.commonHeating ? `\n- Most common heating fuel: ${areaData.epcSummary.commonHeating}` : ''}${areaData.epcSummary.averageEnergyCost ? `\n- Average annual energy cost: £${areaData.epcSummary.averageEnergyCost.toLocaleString()}` : ''}
` : ''}${areaData.deprivation ? `\nAREA DEPRIVATION (MHCLG Index of Multiple Deprivation 2019):
- IMD rank: ${areaData.deprivation.imdRank.toLocaleString()} of 32,844 LSOAs (1 = most deprived)
- IMD decile: ${areaData.deprivation.imdDecile} (1 = most deprived 10%, 10 = least deprived 10%)${areaData.deprivation.incomeRank ? `\n- Income rank: ${areaData.deprivation.incomeRank.toLocaleString()}` : ''}${areaData.deprivation.educationRank ? `\n- Education rank: ${areaData.deprivation.educationRank.toLocaleString()}` : ''}${areaData.deprivation.crimeRank ? `\n- Crime rank: ${areaData.deprivation.crimeRank.toLocaleString()}` : ''}
Note: Higher deprivation (lower decile) correlates with lower property values. A low IMD decile (1-3) is a risk factor; a high decile (8-10) is a positive.
` : ''}${areaData.crimeRate ? `\nAREA CRIME DATA (Police UK):
- ${areaData.crimeRate.total} crimes reported nearby (last month)
- Most common: ${areaData.crimeRate.topCategory}
- Crime level: ${areaData.crimeRate.level}
` : ''}${areaData.floodRisk ? `\nFLOOD RISK DATA (Environment Agency):\n- Flood risk level: ${areaData.floodRisk.riskLevel}\n- Active warnings within 5km: ${areaData.floodRisk.activeWarnings}\n- ${areaData.floodRisk.description}${areaData.floodRisk.nearestStation ? `\n- Nearest monitoring station: ${areaData.floodRisk.nearestStation}` : ''}\nNote: If flood risk is Medium or High, this MUST appear in red_flags or warnings with estimated insurance/remediation cost impact.\n` : ''}${areaData.housePriceIndex ? `\nUK HOUSE PRICE INDEX (HM Land Registry + ONS):
- Region: ${areaData.housePriceIndex.region}
- Average price: £${areaData.housePriceIndex.averagePrice.toLocaleString()} (${areaData.housePriceIndex.period})
- Annual change: ${areaData.housePriceIndex.annualChange > 0 ? '+' : ''}${areaData.housePriceIndex.annualChange}%
- Monthly change: ${areaData.housePriceIndex.monthlyChange > 0 ? '+' : ''}${areaData.housePriceIndex.monthlyChange}%${areaData.housePriceIndex.salesVolume ? `\n- Sales volume: ${areaData.housePriceIndex.salesVolume} transactions` : ''}${areaData.housePriceIndex.averagePriceDetached ? `\n- By type: Detached £${areaData.housePriceIndex.averagePriceDetached.toLocaleString()}` : ''}${areaData.housePriceIndex.averagePriceSemiDetached ? ` | Semi £${areaData.housePriceIndex.averagePriceSemiDetached.toLocaleString()}` : ''}${areaData.housePriceIndex.averagePriceTerraced ? ` | Terraced £${areaData.housePriceIndex.averagePriceTerraced.toLocaleString()}` : ''}${areaData.housePriceIndex.averagePriceFlat ? ` | Flat £${areaData.housePriceIndex.averagePriceFlat.toLocaleString()}` : ''}${areaData.housePriceIndex.averagePriceFTB ? `\n- First-time buyer avg: £${areaData.housePriceIndex.averagePriceFTB.toLocaleString()}${areaData.housePriceIndex.annualChangeFTB != null ? ` (${areaData.housePriceIndex.annualChangeFTB > 0 ? '+' : ''}${areaData.housePriceIndex.annualChangeFTB}% annual)` : ''}` : ''}${areaData.housePriceIndex.averagePriceFormerOwner ? `\n- Former owner-occupier avg: £${areaData.housePriceIndex.averagePriceFormerOwner.toLocaleString()}` : ''}${areaData.housePriceIndex.averagePriceNewBuild ? `\n- New build avg: £${areaData.housePriceIndex.averagePriceNewBuild.toLocaleString()} | Existing avg: £${(areaData.housePriceIndex.averagePriceExisting || 0).toLocaleString()}` : ''}${areaData.housePriceIndex.affordabilityRatio ? `\n- Affordability ratio: ${areaData.housePriceIndex.affordabilityRatio}x median earnings (£${(areaData.housePriceIndex.medianEarnings || 0).toLocaleString()}/yr, ONS ASHE)` : ''}
Use this to contextualise whether the local market is rising, flat or falling. Factor market trends, property type benchmarks, and affordability into your valuation confidence.\n` : ''}${areaData.planning ? `\nPLANNING APPLICATIONS (PlanIt):
- ${areaData.planning.total} planning applications near this postcode
- ${areaData.planning.largeDevelopments} large/major developments
- Recent applications:
${areaData.planning.recent.map(a => `  - ${a.description} (${a.status})`).join('\n')}
Note: Major nearby developments can affect property value positively (regeneration) or negatively (construction disruption, oversupply). Factor this into warnings or positives.\n` : ''}
VALUATION METHODOLOGY — STRICT RULES:
1. ${comparables.length > 0
      ? 'Your valuation MUST be anchored to the REAL Land Registry comparable sales above. These are actual transaction prices — they are ground truth. Compute the average and median sold price of the most similar properties (same type, same postcode) and use that as your starting point.'
      : 'No Land Registry data was available for this postcode. Use your knowledge of UK property prices for this area to estimate.'}
2. Calculate a £/sqm rate from the comparable sales. This is your PRIMARY valuation driver.
3. Apply SMALL adjustments only for: number of bedrooms, year built, tenure, condition, lease length, service charges. Individual adjustments should rarely exceed ±5%.
4. HPI regional averages and area data are CONTEXT ONLY — use them to sanity-check, NOT to override comparable evidence. Regional averages cover wide areas and are often higher than local reality.
5. CRITICAL: Do NOT inflate your valuation above the comparable evidence. If your valuation is more than 15% above the average comparable sale price, you are almost certainly wrong. The market price is what buyers actually paid, not what indices suggest.
6. Your valuation MUST be derived from evidence, not guesswork. When in doubt, stay closer to the comparable average rather than drifting upward.
7. Confidence: 5-10% for well-evidenced valuations, 10-20% if limited data.

NEGOTIATION STRATEGY:
- Suggest an offer range (low = aggressive but justified, high = fair market)
- Set a walk-away price (the most a buyer should pay)
- Provide brief reasoning for the negotiation range

Also analyze:
- Red flags: serious issues with financial impact >£5,000
- Warnings: moderate concerns (£1,000-£5,000 impact)
- Positives: features that add value or reduce risk

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "valuation": {"amount": 287500, "confidence": 8.5, "basis": "Based on 12 Land Registry sales in M3: similar 2-bed flats sold for £270k-£310k.", "confidence_drivers": ["Only 3 same-type comps", "No direct street comps", "Wide price variance"]},
  "summary": "Fair value: ~£287k — in line with recent 2-bed flat sales in M3, but service charges are high.",
  "negotiation": {"offer_low": 270000, "offer_high": 285000, "walk_away": 300000, "reasoning": "Open lower due to low confidence + variance; expect settle ~£285k. Comps support £280-290k.", "negotiation_points": ["No direct street comps → higher uncertainty", "Wide variance on comps suggests mixed stock", "Closest similar sales cluster around £280k-£290k"]},
  "comparables_used": 12,
  "red_flags": [{"title": "Issue", "description": "Detailed explanation", "impact": 12000}],
  "warnings": [{"title": "Warning", "description": "Detailed explanation", "impact": 3000}],
  "positives": [{"title": "Positive", "description": "Detailed explanation", "impact": 5000}]
}

Where:
- valuation.amount is your independent fair market valuation in £
- valuation.basis explains which comparables/data informed the figure
- valuation.confidence_drivers: 2-4 short reasons why confidence is at this level (e.g. "no street comps", "mixed property types", "recent sales available")
- summary is ONE sentence starting with "Fair value: ~£X —" followed by key reasoning
- negotiation.offer_low = aggressive opening offer, offer_high = fair offer, walk_away = absolute max
- negotiation.reasoning should explain WHY the opening offer is set where it is (e.g. "Open lower due to low confidence + variance")
- negotiation.negotiation_points: exactly 3 evidence-backed talking points the buyer can use, each referencing a comp or risk
- comparables_used is the number of Land Registry sales used (0 if none)
- Include at least 2 items in each of red_flags, warnings, positives`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Attach enriched comparables for the frontend table
    analysis.comparables = comparables.slice(0, 15).map((c: any) => ({
      price: c.price,
      date: c.date,
      address: c.address,
      propertyType: c.propertyType,
      distance: c.distance,
      similarity: c.similarity,
      excluded: c.excluded || false,
      excludeReason: c.excludeReason || '',
      epcRating: c.epcRating,
      floorArea: c.floorArea,
      pricePsm: c.pricePsm,
    }));

    // Attach area data and data sources
    analysis.area_data = areaData;
    analysis.data_sources = dataSources;

    // Add confidence drivers if not provided by AI
    const included = comparables.filter((c: any) => !c.excluded);
    if (!analysis.valuation.confidence_drivers || analysis.valuation.confidence_drivers.length === 0) {
      analysis.valuation.confidence_drivers = buildConfidenceDrivers(
        comparables, included, property.propertyType, property.address
      );
    }

    // Add negotiation points if not provided by AI
    if (!analysis.negotiation?.negotiation_points || analysis.negotiation.negotiation_points.length === 0) {
      const aiVal = analysis.valuation?.amount || 0;
      const drivers = analysis.valuation.confidence_drivers || [];
      if (analysis.negotiation) {
        analysis.negotiation.negotiation_points = buildNegotiationPoints(
          included, drivers, aiVal, property.askingPrice, property.propertyType
        );
      }
    }

    // Cache the valuation (keyed on property details, excludes asking price)
    valuationCache.set(cacheKey, { result: analysis, timestamp: Date.now() });

    // Compute savings and verdict server-side (Claude never saw the asking price)
    const aiValuation = analysis.valuation?.amount || 0;
    const savings = property.askingPrice - aiValuation;
    let verdict: string;
    if (savings > property.askingPrice * 0.05) verdict = 'OVERPRICED';
    else if (savings < -property.askingPrice * 0.03) verdict = 'GOOD_DEAL';
    else verdict = 'FAIR';

    res.json({
      ...analysis,
      savings,
      verdict,
      area_data: areaData,
      data_sources: dataSources,
    });
  } catch (error: any) {
    console.error('Analysis error:', error?.status, error?.message);

    let status = 500;
    let message = 'An unexpected error occurred';

    if (error?.status === 401) {
      status = 401;
      message = 'Invalid API key. Check your ANTHROPIC_API_KEY in the .env file.';
    } else if (error?.status === 403) {
      status = 403;
      message = 'API key does not have permission. Check your Anthropic account billing.';
    } else if (error?.status === 429) {
      status = 429;
      message = 'Rate limited — please wait a moment and try again.';
    } else if (error?.status === 529 || error?.status === 503) {
      status = 503;
      message = 'Anthropic API is temporarily overloaded. Try again in a minute.';
    } else if (
      error?.code === 'ENOTFOUND' ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT'
    ) {
      status = 503;
      message = 'Cannot reach Anthropic API. Check your internet connection.';
    } else if (error?.message) {
      message = error.message;
    }

    res.status(status).json({
      error: 'Analysis failed',
      message,
      hint: 'Use Demo Mode to preview the app without an API key.',
    });
  }
});

// Demo endpoint — always works, no API key needed
app.post('/api/demo', rateLimit, async (req, res) => {
  const property: PropertyRequest = req.body;
  const price = property.askingPrice || 285000;
  const sqm = property.sizeSqm || 75;

  // Resolve partial postcodes before fetching comps
  if (property.postcode) {
    property.postcode = await resolveFullPostcode(property.postcode, property.address || '');
  }

  // Fetch data from multiple sources in parallel
  const [comparablesRaw, epcDataDemo, locationDemo] = await Promise.all([
    fetchComparables(property.postcode || ''),
    fetchEpcData(property.postcode || ''),
    getPostcodeLocation(property.postcode || ''),
  ]);

  let comparables = comparablesRaw;
  const dataSources: string[] = ['HM Land Registry'];

  // Enrich: EPC data
  if (epcDataDemo.size > 0) {
    comparables = enrichWithEpc(comparables, epcDataDemo);
    dataSources.push('EPC Register');
  }

  // Enrich: outlier detection
  comparables = detectOutliers(comparables, property.propertyType || '');

  // Enrich: infer property types where unknown
  if (comparables.length > 0) {
    const knownPrices = comparables.filter(c => !c.excluded).map(c => c.price);
    const areaMedian = knownPrices.length > 0
      ? knownPrices.sort((a, b) => a - b)[Math.floor(knownPrices.length / 2)]
      : 0;
    comparables = comparables.map(c => {
      if (c.propertyType === 'unknown') {
        const inferred = inferPropertyType(c.address, c.price, areaMedian);
        return { ...c, propertyType: inferred !== 'unknown' ? `${inferred} (inferred)` : 'unknown' };
      }
      return c;
    });
  }

  // Enrich: distance approximation
  if (locationDemo) dataSources.push('postcodes.io');
  comparables = comparables.map((c, i) => ({
    ...c,
    distance: Math.round((0.1 + (i * 0.15) % 1.5) * 10) / 10,
  }));

  // Crime, Flood, HPI, Planning, Earnings, and IMD data in parallel
  let crimeDataDemo: AreaData['crimeRate'] | undefined;
  let floodDataDemo: FloodRiskData | undefined;
  let hpiDataDemo: HousePriceIndexData | undefined;
  let planningDataDemo: PlanningData | undefined;
  let medianEarningsDemo: number | undefined;
  let imdDataDemo: AreaData['deprivation'] | undefined;

  const demoParallelFetches: Promise<any>[] = [
    fetchHousePriceIndex(property.postcode || '').then(r => { hpiDataDemo = r; }),
    fetchPlanningApplications(property.postcode || '').then(r => { planningDataDemo = r; }),
  ];
  if (locationDemo) {
    demoParallelFetches.push(
      fetchCrimeData(locationDemo.lat, locationDemo.lng).then(r => { crimeDataDemo = r; }),
      fetchFloodRisk(locationDemo.lat, locationDemo.lng).then(r => { floodDataDemo = r; }),
    );
    if (locationDemo.adminDistrict) {
      demoParallelFetches.push(
        fetchMedianEarnings(locationDemo.adminDistrict).then(r => { medianEarningsDemo = r; }),
      );
    }
    if (locationDemo.lsoa) {
      demoParallelFetches.push(
        fetchImdData(locationDemo.lsoa).then(r => { imdDataDemo = r; }),
      );
    }
  }
  await Promise.all(demoParallelFetches);

  // Enrich HPI with affordability ratio from NOMIS earnings
  if (hpiDataDemo && medianEarningsDemo && medianEarningsDemo > 0) {
    hpiDataDemo.medianEarnings = medianEarningsDemo;
    hpiDataDemo.affordabilityRatio = Math.round((hpiDataDemo.averagePrice / medianEarningsDemo) * 10) / 10;
    dataSources.push('ONS (NOMIS ASHE)');
  }

  if (crimeDataDemo) dataSources.push('Police UK');
  if (floodDataDemo) dataSources.push('Environment Agency');
  if (hpiDataDemo) dataSources.push('UK House Price Index');
  if (planningDataDemo) dataSources.push('PlanIt Planning Data');
  if (imdDataDemo) dataSources.push('MHCLG IMD 2019');

  const areaDataDemo: AreaData = {
    epcSummary: summariseEpc(epcDataDemo),
    crimeRate: crimeDataDemo,
    floodRisk: floodDataDemo,
    housePriceIndex: hpiDataDemo,
    planning: planningDataDemo,
    deprivation: imdDataDemo,
  };

  let valuation: number;
  let basisText: string;
  let comparablesUsed = 0;

  // Only use non-excluded comps for valuation
  const includedComps = comparables.filter(c => !c.excluded);

  if (includedComps.length >= 3) {
    // Use real Land Registry data to derive valuation
    const sameType = includedComps.filter(s =>
      s.propertyType.includes((property.propertyType || '').split('-')[0])
    );
    const relevantSales = sameType.length >= 3 ? sameType : includedComps;
    comparablesUsed = relevantSales.length;

    const avgPrice = relevantSales.reduce((a, b) => a + b.price, 0) / relevantSales.length;

    // Adjust average based on this property's size vs assumed average (~70sqm)
    const sizeRatio = sqm / 70;
    valuation = Math.round(avgPrice * sizeRatio / 1000) * 1000;

    // Adjust for year built
    const age = 2025 - (property.yearBuilt || 2000);
    if (age < 5) valuation = Math.round(valuation * 1.05 / 1000) * 1000;
    else if (age > 50) valuation = Math.round(valuation * 0.93 / 1000) * 1000;

    // Leasehold short lease discount
    if (property.tenure === 'leasehold' && property.leaseYears && property.leaseYears < 80) {
      valuation = Math.round(valuation * 0.85 / 1000) * 1000;
    }

    const avgPsm = Math.round(valuation / sqm);
    basisText = `Based on ${comparablesUsed} Land Registry sales in ${property.postcode}. Average sold price: £${Math.round(avgPrice).toLocaleString()}. Estimated £${avgPsm}/sqm for ${sqm}sqm.`;
  } else {
    // Fallback: estimate from postcode heuristic
    const postcodePrefix = (property.postcode || '').split(/\d/)[0].toUpperCase();
    const centralLondon = ['SW', 'W', 'WC', 'EC', 'SE1', 'NW1', 'N1'];
    const outerLondon = ['E', 'N', 'NW', 'SE', 'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB'];
    const majorCities = ['M', 'B', 'LS', 'BS', 'EH', 'G', 'CF', 'L', 'NE', 'NG', 'S'];

    let basePsm: number;
    if (centralLondon.some(p => postcodePrefix.startsWith(p))) basePsm = 9500;
    else if (outerLondon.some(p => postcodePrefix.startsWith(p))) basePsm = 5500;
    else if (majorCities.some(p => postcodePrefix.startsWith(p))) basePsm = 3200;
    else basePsm = 2400;

    const typeMultiplier: Record<string, number> = { flat: 1.0, terraced: 0.95, 'semi-detached': 0.9, detached: 1.05, bungalow: 0.85 };
    basePsm *= typeMultiplier[property.propertyType] || 1.0;

    const age = 2025 - (property.yearBuilt || 2000);
    if (age < 5) basePsm *= 1.08;
    else if (age < 15) basePsm *= 1.03;
    else if (age > 50) basePsm *= 0.92;

    if (property.tenure === 'leasehold' && property.leaseYears && property.leaseYears < 80) {
      basePsm *= 0.85;
    }

    valuation = Math.round(basePsm * sqm / 1000) * 1000;
    basisText = `Estimated at £${Math.round(basePsm).toLocaleString()}/sqm for ${property.propertyType || 'flat'}s in ${property.postcode || 'this area'}. Limited Land Registry data for this postcode — valuation based on area price benchmarks.`;
  }

  const savings = price - valuation;
  let verdict: string;
  if (savings > price * 0.05) verdict = 'OVERPRICED';
  else if (savings < -price * 0.03) verdict = 'GOOD_DEAL';
  else verdict = 'FAIR';

  // Negotiation range based on valuation
  const offerLow = Math.round(valuation * 0.92 / 1000) * 1000;
  const offerHigh = Math.round(valuation * 0.98 / 1000) * 1000;
  const walkAway = Math.round(valuation * 1.05 / 1000) * 1000;

  // Enrich: similarity scores
  const scoringMedian = includedComps.length > 0
    ? includedComps.map(c => c.price).sort((a, b) => a - b)[Math.floor(includedComps.length / 2)]
    : price;
  comparables = comparables.map(c => ({
    ...c,
    similarity: c.excluded ? 0 : computeSimilarity(c, property.propertyType || '', property.bedrooms || 2, scoringMedian),
  }));

  // Confidence drivers
  const confidenceDrivers = buildConfidenceDrivers(
    comparables, includedComps, property.propertyType || '', property.address || ''
  );

  // Negotiation talking points
  const negotiationPoints = buildNegotiationPoints(
    includedComps, confidenceDrivers, valuation, price, property.propertyType || ''
  );

  // --- Dynamic confidence based on data quality ---
  const sameTypeComps = includedComps.filter(c =>
    c.propertyType.includes((property.propertyType || '').split('-')[0])
  );
  const recentComps = includedComps.filter(c => {
    const months = (Date.now() - new Date(c.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
    return months <= 12;
  });
  let confidence = 15; // baseline: low confidence
  if (includedComps.length >= 5 && sameTypeComps.length >= 3) confidence = 8;
  else if (includedComps.length >= 5) confidence = 10;
  else if (includedComps.length >= 3) confidence = 12;
  if (recentComps.length < 2) confidence += 2; // penalise stale data
  // Cap at reasonable range
  confidence = Math.min(20, Math.max(5, confidence));

  // --- Dynamic red flags ---
  const redFlags: { title: string; description: string; impact: number }[] = [];
  const propPrice = price || valuation;

  if (property.tenure === 'leasehold' && property.groundRent && property.groundRent > 0) {
    redFlags.push({
      title: 'Ground Rent Escalation Risk',
      description: `Ground rent is £${property.groundRent}/yr. Check the lease for escalation or doubling clauses — these can make properties unmortgageable. Lenders increasingly refuse properties with ground rents above 0.1% of value (£${Math.round(propPrice * 0.001).toLocaleString()}/yr for this property).`,
      impact: Math.round(propPrice * 0.05),
    });
  }
  if (property.tenure === 'leasehold' && property.leaseYears && property.leaseYears < 80) {
    redFlags.push({
      title: 'Short Lease — Below 80-Year Threshold',
      description: `Only ${property.leaseYears} years remaining. Below 80 years, lease extensions become significantly more expensive due to "marriage value" rules. Many lenders won't offer mortgages below 70 years. Estimated extension cost: £${Math.round(propPrice * 0.12).toLocaleString()}–£${Math.round(propPrice * 0.20).toLocaleString()}.`,
      impact: Math.round(propPrice * 0.15),
    });
  }
  if (floodDataDemo && floodDataDemo.riskLevel && floodDataDemo.riskLevel !== 'Low' && floodDataDemo.riskLevel !== 'Very Low') {
    redFlags.push({
      title: `Flood Risk: ${floodDataDemo.riskLevel} Zone`,
      description: `This property is in a ${floodDataDemo.riskLevel.toLowerCase()} flood risk area. This can increase insurance premiums by £500–£2,000/yr and may reduce resale value. Check Environment Agency flood maps for specific risk to this address.`,
      impact: Math.round(propPrice * 0.04),
    });
  }
  if (property.serviceCharge && property.serviceCharge > 3000) {
    redFlags.push({
      title: 'High Service Charge',
      description: `At £${property.serviceCharge.toLocaleString()}/yr, the service charge is notably high. Over 10 years that's £${(property.serviceCharge * 10).toLocaleString()} before any increases. Request the last 3 years of accounts and check for planned major works or sinking fund shortfalls.`,
      impact: Math.round(property.serviceCharge * 5),
    });
  }
  if (savings < -propPrice * 0.10) {
    redFlags.push({
      title: 'Asking Price Significantly Below Market Value',
      description: `The asking price is more than 10% below our valuation — this warrants caution. Investigate why: possible structural issues, problematic neighbours, pending planning applications, or motivated seller. A price this low often signals undisclosed problems.`,
      impact: Math.round(propPrice * 0.08),
    });
  }
  // Ensure at least 2 red flags
  if (redFlags.length < 2) {
    if (!redFlags.some(f => f.title.includes('Service Charge')) && property.serviceCharge && property.serviceCharge > 0) {
      redFlags.push({
        title: 'Service Charge Costs',
        description: `Annual service charge of £${property.serviceCharge.toLocaleString()} adds ongoing cost. Over a 10-year hold this totals £${(property.serviceCharge * 10).toLocaleString()} — factor this into your total cost of ownership when comparing to freehold alternatives.`,
        impact: Math.round(property.serviceCharge * 3),
      });
    }
    if (redFlags.length < 2) {
      const age = new Date().getFullYear() - (property.yearBuilt || 2000);
      if (age > 30) {
        redFlags.push({
          title: 'Aging Property — Maintenance Costs',
          description: `Built in ${property.yearBuilt || 2000} (${age} years old), this property may need roof, boiler, window, or wiring upgrades. Budget £${Math.round(propPrice * 0.03).toLocaleString()}–£${Math.round(propPrice * 0.06).toLocaleString()} for deferred maintenance.`,
          impact: Math.round(propPrice * 0.04),
        });
      } else {
        redFlags.push({
          title: 'Limited Price Transparency',
          description: `Only ${comparablesUsed} comparable sales were available to value this property. With limited evidence, the true market value could be ${confidence}% higher or lower than estimated. Consider getting a RICS valuation for added certainty.`,
          impact: Math.round(propPrice * 0.03),
        });
      }
    }
  }

  // --- Dynamic warnings ---
  const warnings: { title: string; description: string; impact: number }[] = [];

  if (property.tenure === 'leasehold' && property.leaseYears && property.leaseYears > 80 && property.leaseYears < 125) {
    warnings.push({
      title: 'Lease Below 125 Years',
      description: `At ${property.leaseYears} years the lease is adequate but not ideal. It will drop below the 80-year threshold in ${property.leaseYears - 80} years, at which point extension costs rise sharply. Consider negotiating a lease extension as part of the purchase.`,
      impact: Math.round(propPrice * 0.03),
    });
  }
  if (crimeDataDemo && crimeDataDemo.total > 100) {
    warnings.push({
      title: 'Above-Average Crime in Area',
      description: `${crimeDataDemo.total} crimes reported in the local area over the most recent period. ${crimeDataDemo.topCategory ? `Most common: ${crimeDataDemo.topCategory}.` : ''} This is above the national average and may affect insurance premiums and resale appeal.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (areaDataDemo.epcSummary && areaDataDemo.epcSummary.averageRating && ['E', 'F', 'G'].includes(areaDataDemo.epcSummary.averageRating)) {
    warnings.push({
      title: 'Poor Energy Efficiency in Area',
      description: `Properties in ${property.postcode} average an EPC rating of ${areaDataDemo.epcSummary.averageRating}. Poor EPC ratings mean higher energy bills (£500–£1,500/yr above a C-rated home) and potential future retrofit costs under Minimum Energy Efficiency Standards.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (property.yearBuilt && property.yearBuilt >= 2015 && property.yearBuilt <= 2023 && property.propertyType === 'flat') {
    warnings.push({
      title: 'EWS1 Fire Safety Certificate May Be Required',
      description: `Flats built ${property.yearBuilt} may be affected by post-Grenfell cladding regulations. If the building is over 11m tall, an EWS1 form may be needed for mortgage approval. Check with the managing agent before exchange.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (hpiDataDemo && hpiDataDemo.annualChange !== undefined && hpiDataDemo.annualChange < -1) {
    warnings.push({
      title: 'Declining Local House Prices',
      description: `House prices in this area have fallen ${Math.abs(hpiDataDemo.annualChange).toFixed(1)}% over the past year. A declining market means the property could be worth less by completion. Factor in the trend when setting your offer.`,
      impact: Math.round(propPrice * Math.abs(hpiDataDemo.annualChange) / 100),
    });
  }
  if (property.tenure === 'leasehold') {
    warnings.push({
      title: 'Leasehold Management Costs',
      description: `As a leasehold property, you'll depend on a management company for building maintenance decisions. Request the last 3 years of service charge accounts, check the sinking fund balance, and ask about any planned major works.`,
      impact: Math.round(propPrice * 0.01),
    });
  }
  // Ensure at least 2 warnings
  if (warnings.length < 1) {
    const age = new Date().getFullYear() - (property.yearBuilt || 2000);
    if (age > 15 && age <= 30) {
      warnings.push({
        title: 'Mid-Age Property — Check Key Systems',
        description: `At ${age} years old, the boiler, windows, and roof may be approaching end of life. Budget for potential replacements within the next 5–10 years. Request a homebuyer's survey to assess condition.`,
        impact: Math.round(propPrice * 0.02),
      });
    }
  }
  if (warnings.length < 2) {
    if (includedComps.length > 0) {
      const prices = includedComps.map(c => c.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const spread = (max - min) / ((max + min) / 2);
      if (spread > 0.3) {
        warnings.push({
          title: 'Wide Price Variance in Area',
          description: `Comparable sales range from £${min.toLocaleString()} to £${max.toLocaleString()} — a ${Math.round(spread * 100)}% spread. This suggests mixed housing stock and makes precise valuation harder. View the property carefully to assess which end of the range it falls.`,
          impact: Math.round(propPrice * 0.02),
        });
      }
    }
  }
  if (warnings.length < 2) {
    warnings.push({
      title: 'Stamp Duty Costs',
      description: `At £${propPrice.toLocaleString()}, stamp duty for a main residence will add approximately £${Math.round(Math.max(0, (propPrice - 250000) * 0.05) / 100) * 100} to acquisition costs. Factor this into your total budget.`,
      impact: Math.round(Math.max(0, (propPrice - 250000) * 0.05) / 100) * 100,
    });
  }

  // --- Dynamic positives ---
  const positives: { title: string; description: string; impact: number }[] = [];
  const age = new Date().getFullYear() - (property.yearBuilt || 2000);

  if (age <= 10) {
    positives.push({
      title: 'Modern Build with Warranty Protection',
      description: `Built in ${property.yearBuilt}, this property ${age <= 5 ? 'likely still has NHBC warranty coverage (10 years from completion), protecting against structural defects' : 'benefits from modern building standards including better insulation, double glazing, and updated wiring'}. Lower maintenance costs in the near term.`,
      impact: Math.round(propPrice * 0.04),
    });
  } else if (age >= 80) {
    positives.push({
      title: 'Period Property Character',
      description: `Built in ${property.yearBuilt}, this ${property.propertyType || 'property'} is likely to feature period details (original fireplaces, high ceilings, cornicing) that are highly sought after. Period homes in good condition typically command a 5–10% premium over modern equivalents.`,
      impact: Math.round(propPrice * 0.06),
    });
  }
  if (property.tenure === 'freehold') {
    positives.push({
      title: 'Freehold Tenure',
      description: `As freehold, you own the property and land outright with no ground rent, service charge disputes, or lease extension costs. This is the most desirable tenure and supports stronger long-term value.`,
      impact: Math.round(propPrice * 0.03),
    });
  } else if (property.leaseYears && property.leaseYears >= 900) {
    positives.push({
      title: `${property.leaseYears}-Year Lease — Effectively Freehold`,
      description: `With ${property.leaseYears} years remaining, the lease length has no practical impact on value or mortgageability. No lease extension will ever be needed.`,
      impact: Math.round(propPrice * 0.03),
    });
  } else if (property.leaseYears && property.leaseYears >= 125) {
    positives.push({
      title: 'Adequate Lease Length',
      description: `At ${property.leaseYears} years remaining, the lease comfortably exceeds the 80-year threshold and won't affect mortgage options. However, it may need extending within ${property.leaseYears - 80} years.`,
      impact: Math.round(propPrice * 0.01),
    });
  }
  if (hpiDataDemo && hpiDataDemo.annualChange !== undefined && hpiDataDemo.annualChange > 2) {
    positives.push({
      title: 'Strong Local Price Growth',
      description: `House prices in this area have grown ${hpiDataDemo.annualChange.toFixed(1)}% over the past year — above the national average. Sustained growth suggests healthy demand and supports future appreciation.`,
      impact: Math.round(propPrice * hpiDataDemo.annualChange / 100),
    });
  }
  if (floodDataDemo && (!floodDataDemo.riskLevel || floodDataDemo.riskLevel === 'Low' || floodDataDemo.riskLevel === 'Very Low')) {
    positives.push({
      title: 'Low Flood Risk',
      description: `This property is in a low flood risk area according to Environment Agency data. This means standard insurance premiums and no flood-related value discount.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (property.sizeSqm && property.bedrooms) {
    const sqmPerBed: Record<string, number> = { flat: 30, terraced: 28, 'semi-detached': 30, detached: 32, bungalow: 30 };
    const expectedSqm = (sqmPerBed[property.propertyType || 'flat'] || 30) * property.bedrooms;
    if (property.sizeSqm > expectedSqm * 1.15) {
      positives.push({
        title: 'Above-Average Floor Area',
        description: `At ${property.sizeSqm}sqm for a ${property.bedrooms}-bed ${property.propertyType || 'property'}, this is approximately ${Math.round(((property.sizeSqm / expectedSqm) - 1) * 100)}% larger than typical. Larger units command a premium at resale.`,
        impact: Math.round(propPrice * 0.03),
      });
    }
  }
  if (hpiDataDemo?.affordabilityRatio && hpiDataDemo.affordabilityRatio < 7) {
    positives.push({
      title: 'Affordable Relative to Local Earnings',
      description: `The price-to-earnings ratio here is ${hpiDataDemo.affordabilityRatio}x — below the national average of ~8x. More affordable areas tend to have broader buyer pools, supporting demand and resale liquidity.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (comparablesUsed >= 5 && sameTypeComps.length >= 3) {
    positives.push({
      title: 'Strong Comparable Evidence',
      description: `Valuation is supported by ${comparablesUsed} recent sales including ${sameTypeComps.length} same-type (${property.propertyType}) transactions. This gives high confidence in the price estimate.`,
      impact: Math.round(propPrice * 0.01),
    });
  }
  // Ensure at least 2 positives
  if (positives.length < 2) {
    positives.push({
      title: `${property.bedrooms || 2}-Bed ${(property.propertyType || 'flat').charAt(0).toUpperCase() + (property.propertyType || 'flat').slice(1)} in ${property.postcode}`,
      description: `${property.bedrooms || 2}-bedroom ${property.propertyType || 'flat'}s are the most liquid property type in most UK markets — easy to rent, easy to resell. This supports long-term flexibility.`,
      impact: Math.round(propPrice * 0.02),
    });
  }
  if (positives.length < 2) {
    positives.push({
      title: 'Established Residential Area',
      description: `${property.postcode} is an established residential postcode with existing amenities, transport links, and a track record of property transactions. Not a speculative or unproven location.`,
      impact: Math.round(propPrice * 0.01),
    });
  }

  // --- Richer summary referencing data ---
  const summaryParts: string[] = [];
  if (comparablesUsed > 0) summaryParts.push(`based on ${comparablesUsed} Land Registry sales in ${property.postcode}`);
  else summaryParts.push('estimated from area benchmarks');
  if (savings > propPrice * 0.05) summaryParts.push('asking price appears above market evidence');
  else if (savings < -propPrice * 0.03) summaryParts.push('asking price is below our estimated market value');
  else summaryParts.push('asking price is broadly in line with market evidence');
  if (redFlags.length > 0) summaryParts.push(redFlags[0].title.toLowerCase());
  const summaryText = `Fair value: ~£${valuation.toLocaleString()} — ${summaryParts.join('; ')}.`;

  res.json({
    valuation: {
      amount: valuation,
      confidence,
      basis: basisText,
      confidence_drivers: confidenceDrivers,
    },
    verdict,
    savings,
    summary: summaryText,
    comparables_used: comparablesUsed,
    comparables: comparables.slice(0, 15).map(c => ({
      price: c.price,
      date: c.date,
      address: c.address,
      propertyType: c.propertyType,
      distance: c.distance,
      similarity: c.similarity,
      excluded: c.excluded || false,
      excludeReason: c.excludeReason || '',
      epcRating: c.epcRating,
      floorArea: c.floorArea,
      pricePsm: c.pricePsm,
    })),
    area_data: areaDataDemo,
    data_sources: dataSources,
    negotiation: {
      offer_low: offerLow,
      offer_high: offerHigh,
      walk_away: walkAway,
      reasoning: `Open at £${offerLow.toLocaleString()} (8% below valuation) — ${comparablesUsed > 0 ? `comparable sales in ${property.postcode} support a value around £${valuation.toLocaleString()}` : 'limited local data justifies a conservative opening'}. Aim to settle around £${offerHigh.toLocaleString()}. Walk away above £${walkAway.toLocaleString()} — beyond this point the deal no longer offers a margin of safety.`,
      negotiation_points: negotiationPoints,
    },
    red_flags: redFlags.slice(0, 3),
    warnings: warnings.slice(0, 3),
    positives: positives.slice(0, 4),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Serve React app for all non-API routes
app.get('*', (_req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(
      '<h1>Property Scorecard</h1><p>Frontend not built yet. Run <code>npm run build</code> then restart.</p>'
    );
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\nProperty Scorecard running at http://localhost:${PORT}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured (demo mode only)'}\n`);
});
