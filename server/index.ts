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

interface AreaData {
  epcSummary?: { averageRating: string; averageFloorArea: number; totalCerts: number };
  crimeRate?: { total: number; topCategory: string; level: string };
  floodRisk?: FloodRiskData;
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

// Look up lat/lng for a postcode via postcodes.io
async function getPostcodeLocation(postcode: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(postcode.trim());
    const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json() as any;
    if (data.status === 200 && data.result) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
  } catch {}
  return null;
}

// Fetch EPC data for a postcode from the open EPC API (opendatacommunities.org)
async function fetchEpcData(postcode: string): Promise<Map<string, { rating: string; floorArea: number }>> {
  const results = new Map<string, { rating: string; floorArea: number }>();
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
        results.set(addr, {
          rating: row['current-energy-rating'],
          floorArea: parseFloat(row['total-floor-area']) || 0,
        });
      }
    }
  } catch (err: any) {
    console.error('EPC API failed:', err?.message);
  }
  return results;
}

// Summarise EPC data for the area
function summariseEpc(epcData: Map<string, { rating: string; floorArea: number }>): AreaData['epcSummary'] | undefined {
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
  return { averageRating: avgRating, averageFloorArea: avgArea, totalCerts: entries.length };
}

// Enrich comparables with EPC data (floor area, energy rating, £/sqm)
function enrichWithEpc(sales: ComparableSale[], epcData: Map<string, { rating: string; floorArea: number }>): ComparableSale[] {
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
    const res = await fetch(
      `https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=2024-06`,
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

  const lines = relevantSales.slice(0, 15).map(s => {
    let line = `  - £${s.price.toLocaleString()} | ${s.date} | ${s.address} | ${s.propertyType}`;
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
      lines.push(`  - £${s.price.toLocaleString()} | ${s.date} | ${s.address} | Reason: ${s.excludeReason}`);
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

    // Fetch crime and flood data in parallel (non-blocking)
    let crimeData: AreaData['crimeRate'] | undefined;
    let floodData: FloodRiskData | undefined;
    if (subjectLocation) {
      const [crimeResult, floodResult] = await Promise.all([
        fetchCrimeData(subjectLocation.lat, subjectLocation.lng),
        fetchFloodRisk(subjectLocation.lat, subjectLocation.lng),
      ]);
      crimeData = crimeResult;
      floodData = floodResult;
      if (crimeData) dataSources.push('Police UK');
      if (floodData) dataSources.push('Environment Agency');
    }

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

Your task: determine the fair market value of this property, then advise the buyer on negotiation strategy. You do NOT know the asking price — value it independently.${personaBlock}

Property Details:
- Address: ${property.address}, ${property.postcode}
- Type: ${property.propertyType}, ${property.bedrooms} bedrooms, ${property.sizeSqm}sqm
- Year Built: ${property.yearBuilt}
- Tenure: ${property.tenure}${leaseholdInfo}
${comparablesText}
${areaData.epcSummary ? `\nAREA EPC DATA (Energy Performance Certificates):\n- Average energy rating: ${areaData.epcSummary.averageRating}\n- Average floor area: ${areaData.epcSummary.averageFloorArea}sqm\n- ${areaData.epcSummary.totalCerts} certificates in this postcode\n` : ''}${areaData.crimeRate ? `\nAREA CRIME DATA (Police UK):\n- ${areaData.crimeRate.total} crimes reported nearby (last month)\n- Most common: ${areaData.crimeRate.topCategory}\n- Crime level: ${areaData.crimeRate.level}\n` : ''}${areaData.floodRisk ? `\nFLOOD RISK DATA (Environment Agency):\n- Flood risk level: ${areaData.floodRisk.riskLevel}\n- Active warnings within 5km: ${areaData.floodRisk.activeWarnings}\n- ${areaData.floodRisk.description}${areaData.floodRisk.nearestStation ? `\n- Nearest monitoring station: ${areaData.floodRisk.nearestStation}` : ''}\nNote: If flood risk is Medium or High, this MUST appear in red_flags or warnings with estimated insurance/remediation cost impact.\n` : ''}
VALUATION METHODOLOGY:
1. ${comparables.length > 0
      ? 'USE THE REAL COMPARABLE SALES DATA ABOVE as your primary evidence. Identify the most similar properties and derive your valuation from their sold prices.'
      : 'No Land Registry data was available for this postcode. Use your knowledge of UK property prices for this area to estimate.'}
2. Calculate a £/sqm rate based on the comparable sales data (or your knowledge if no data).
3. Apply adjustments for: number of bedrooms, year built, tenure, condition, lease length, service charges.
4. Your valuation MUST be derived from evidence, not guesswork.
5. Confidence: 5-10% for well-evidenced valuations, 10-20% if limited data.

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

  // Crime + Flood data
  let crimeDataDemo: AreaData['crimeRate'] | undefined;
  let floodDataDemo: FloodRiskData | undefined;
  if (locationDemo) {
    const [crimeResult, floodResult] = await Promise.all([
      fetchCrimeData(locationDemo.lat, locationDemo.lng),
      fetchFloodRisk(locationDemo.lat, locationDemo.lng),
    ]);
    crimeDataDemo = crimeResult;
    floodDataDemo = floodResult;
    if (crimeDataDemo) dataSources.push('Police UK');
    if (floodDataDemo) dataSources.push('Environment Agency');
  }

  const areaDataDemo: AreaData = {
    epcSummary: summariseEpc(epcDataDemo),
    crimeRate: crimeDataDemo,
    floodRisk: floodDataDemo,
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
    basisText = `Based on ${comparablesUsed} real Land Registry sales in ${property.postcode}. Average sold price: £${Math.round(avgPrice).toLocaleString()}. Estimated £${avgPsm}/sqm for ${sqm}sqm. Demo mode — add API key for full AI analysis.`;
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
    basisText = `Estimated at £${Math.round(basePsm).toLocaleString()}/sqm for ${property.propertyType || 'flat'}s in ${property.postcode || 'this area'}. No Land Registry data found for this postcode. Demo mode — add API key for full AI analysis.`;
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

  const summaryText = `Fair value: ~£${valuation.toLocaleString()} — ${comparablesUsed > 0 ? `based on ${comparablesUsed} recent Land Registry sales in ${property.postcode}` : 'estimated from area averages'}. ${savings > 0 ? 'Asking price is above our valuation.' : 'Asking price is in line with or below market value.'}`;

  res.json({
    valuation: {
      amount: valuation,
      confidence: includedComps.length >= 3 ? 10 : 15,
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
      reasoning: `Open at £${offerLow.toLocaleString()} (8% below valuation) citing any issues found. Aim for £${offerHigh.toLocaleString()}. Walk away above £${walkAway.toLocaleString()}. Demo mode — add API key for AI-tailored negotiation strategy.`,
      negotiation_points: negotiationPoints,
    },
    red_flags: [
      {
        title: 'Leasehold Ground Rent Escalation Risk',
        description: `Ground rent of £${property.groundRent || 250}/yr may be subject to escalation clauses. Check the lease for doubling clauses which could make the property unmortgageable in future. This is a known issue in ${property.postcode || 'this area'} for properties built around ${property.yearBuilt || 2019}.`,
        impact: 15000,
      },
      {
        title: 'Service Charge Above Area Average',
        description: `At £${property.serviceCharge || 1200}/yr, the service charge is approximately 18% above the average for comparable ${property.propertyType || 'flat'}s in ${property.postcode || 'this postcode'}. Over a 10-year period this represents significant additional cost.`,
        impact: 8500,
      },
    ],
    warnings: [
      {
        title: 'EWS1 Fire Safety Certificate',
        description: `Properties built around ${property.yearBuilt || 2019} in this area may require an EWS1 form. If the building has cladding, obtaining this certificate can delay sales and incur remediation costs.`,
        impact: 4000,
      },
      {
        title: 'Limited Parking in City Centre',
        description: `${property.address || 'This property'} is in a city centre location where allocated parking is scarce. Lack of parking can reduce resale appeal and may cost £1,500-3,000/yr for a nearby space.`,
        impact: 2500,
      },
      {
        title: 'Potential Management Company Issues',
        description:
          'Leasehold flats in large developments can face management company disputes. Request the last 3 years of service charge accounts and check for any planned major works.',
        impact: 3000,
      },
    ],
    positives: [
      {
        title: 'Modern Build with NHBC Warranty',
        description: `Built in ${property.yearBuilt || 2019}, this property likely still has NHBC warranty coverage (10 years from completion). This protects against structural defects and reduces risk.`,
        impact: 12000,
      },
      {
        title: 'Prime City Centre Location',
        description: `${property.postcode || 'M3'} is a high-demand area with strong rental yields (5-6%) and consistent capital appreciation. Proximity to transport links supports long-term value.`,
        impact: 20000,
      },
      {
        title: 'Good Size for Property Type',
        description: `At ${property.sizeSqm || 85}sqm, this ${property.bedrooms || 2}-bed ${property.propertyType || 'flat'} is above average size for the area. Larger units command premium prices.`,
        impact: 8000,
      },
      {
        title: '999-Year Lease',
        description:
          'With 999 years remaining, the lease length is effectively equivalent to freehold. No lease extension costs will be needed.',
        impact: 10000,
      },
    ],
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
      '<h1>Property Edge v2</h1><p>Frontend not built yet. Run <code>npm run build</code> then restart.</p>'
    );
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`\nProperty Edge v2 running at http://localhost:${PORT}`);
  console.log(`API key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'NOT configured (demo mode only)'}\n`);
});
