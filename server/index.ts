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
  if (!body.postcode || typeof body.postcode !== 'string' || !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(body.postcode.trim())) return { valid: false, error: 'Invalid UK postcode' };
  if (typeof body.askingPrice !== 'number' || body.askingPrice < 1000 || body.askingPrice > 100_000_000) return { valid: false, error: 'Asking price must be between £1,000 and £100,000,000' };
  if (typeof body.bedrooms !== 'number' || body.bedrooms < 0 || body.bedrooms > 20) return { valid: false, error: 'Bedrooms must be 0-20' };
  if (typeof body.sizeSqm !== 'number' || body.sizeSqm < 5 || body.sizeSqm > 10000) return { valid: false, error: 'Size must be 5-10,000 sqm' };
  if (typeof body.yearBuilt !== 'number' || body.yearBuilt < 1500 || body.yearBuilt > new Date().getFullYear() + 2) return { valid: false, error: 'Invalid year built' };
  return { valid: true };
}

app.use(cors());
app.use(express.json({ limit: '100kb' }));

// ─── Real-data types ──────────────────────────────────────────────────────────

interface LRComparable {
  price: number;
  date: string;
  propertyType: string; // 'flat' | 'terraced' | 'semi-detached' | 'detached' | 'other'
  tenure: string;       // 'leasehold' | 'freehold'
  address: string;
  newBuild: boolean;
}

interface PostcodeInfo {
  region: string;
  adminDistrict: string;
  adminDistrictCode: string;
  country: string;
  ward: string;
  constituency: string;
  lsoa: string;
  latitude: number | null;
  longitude: number | null;
}

interface CrimeStats {
  total: number;
  months: number;
  perMonth: number;
  topCategories: Array<{ label: string; count: number; pct: number }>;
}

interface FloodRisk {
  zone3: boolean;  // high risk — >3.3% annual probability
  zone2: boolean;  // medium risk — 0.1–1% annual probability
}

interface UnemploymentData {
  rate: number;        // percentage
  area: string;
  date: string;
}

interface EPCRecord {
  address: string;
  energyRating: string;
  floorArea: number;
  inspectionDate: string;
}

// ─── Real-data fetchers ───────────────────────────────────────────────────────

function lrTypeLabel(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.toLowerCase() : JSON.stringify(raw ?? '').toLowerCase();
  if (s.includes('flat') || s.includes('maisonette')) return 'flat';
  if (s.includes('semi')) return 'semi-detached';
  if (s.includes('terraced')) return 'terraced';
  if (s.includes('detached')) return 'detached';
  return 'other';
}

async function fetchLRComparables(postcode: string): Promise<LRComparable[]> {
  const encoded = encodeURIComponent(postcode.trim().toUpperCase());
  const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encoded}&_pageSize=100&_sort=-transactionDate`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(9000),
  });
  if (!res.ok) throw new Error(`LR API ${res.status}`);
  const data = await res.json() as any;
  const items: any[] = data?.result?.items ?? [];
  return items
    .map((item) => ({
      price: Number(item.pricePaid ?? 0),
      date: String(item.transactionDate ?? '').slice(0, 10),
      propertyType: lrTypeLabel(item.propertyType),
      tenure: String(item.estateType ?? '').toLowerCase().includes('lease') ? 'leasehold' : 'freehold',
      address: [item.propertyAddress?.paon, item.propertyAddress?.saon, item.propertyAddress?.street]
        .filter(Boolean).join(' '),
      newBuild: item.newBuild === true || item.newBuild === 'Y',
    }))
    .filter((c) => c.price > 0);
}

async function fetchPostcodeInfo(postcode: string): Promise<PostcodeInfo | null> {
  const encoded = postcode.trim().replace(/\s+/g, '');
  const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data = await res.json() as any;
  if (!data?.result) return null;
  const r = data.result;
  return {
    region: r.region || r.country || '',
    adminDistrict: r.admin_district || '',
    adminDistrictCode: r.codes?.admin_district || '',
    country: r.country || 'England',
    ward: r.admin_ward || '',
    constituency: r.parliamentary_constituency_2024 || r.parliamentary_constituency || '',
    lsoa: r.lsoa || '',
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
  };
}

const CRIME_LABELS: Record<string, string> = {
  'anti-social-behaviour': 'Anti-social behaviour',
  'violent-crime': 'Violent crime',
  'burglary': 'Burglary',
  'vehicle-crime': 'Vehicle crime',
  'criminal-damage-arson': 'Criminal damage & arson',
  'robbery': 'Robbery',
  'shoplifting': 'Shoplifting',
  'drugs': 'Drugs offences',
  'theft-from-the-person': 'Theft from person',
  'possession-of-weapons': 'Weapons possession',
  'public-order': 'Public order',
  'other-theft': 'Other theft',
  'bicycle-theft': 'Bicycle theft',
  'other-crime': 'Other crime',
};

function prevMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = 1; i <= n; i++) {
    d.setMonth(d.getMonth() - 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

async function fetchCrimeStats(lat: number, lng: number): Promise<CrimeStats> {
  const months = prevMonths(3);
  const results = await Promise.allSettled(
    months.map((m) =>
      fetch(`https://data.police.uk/api/crimes-street/all-crime?lat=${lat}&lng=${lng}&date=${m}`, {
        signal: AbortSignal.timeout(8000),
      }).then((r) => (r.ok ? r.json() as Promise<any[]> : Promise.resolve([])))
    )
  );
  const all: any[] = results
    .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value ?? []);

  const counts: Record<string, number> = {};
  for (const c of all) counts[c.category || 'other-crime'] = (counts[c.category || 'other-crime'] || 0) + 1;

  const total = all.length;
  const successMonths = results.filter((r) => r.status === 'fulfilled').length;
  const topCategories = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([cat, count]) => ({
      label: CRIME_LABELS[cat] || cat,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  return { total, months: successMonths, perMonth: successMonths > 0 ? Math.round(total / successMonths) : 0, topCategories };
}

async function fetchFloodRisk(lat: number, lng: number): Promise<FloodRisk> {
  const base = 'https://environment.data.gov.uk/arcgis/rest/services/EA';
  const params = `geometry=${lng},${lat}&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`;
  const [z3, z2] = await Promise.allSettled([
    fetch(`${base}/FloodMapForPlanningRiversAndSeaFloodZone3/MapServer/0/query?${params}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok ? r.json() as Promise<any> : null),
    fetch(`${base}/FloodMapForPlanningRiversAndSeaFloodZone2/MapServer/0/query?${params}`, { signal: AbortSignal.timeout(8000) }).then((r) => r.ok ? r.json() as Promise<any> : null),
  ]);
  return {
    zone3: z3.status === 'fulfilled' && (z3.value as any)?.count > 0,
    zone2: z2.status === 'fulfilled' && (z2.value as any)?.count > 0,
  };
}

async function fetchUnemployment(adminDistrictCode: string, adminDistrict: string): Promise<UnemploymentData | null> {
  if (!adminDistrictCode) return null;
  // Nomis API — Labour Market Profile (NM_17_5), claimant count rate, latest month
  // Geography ID is derived from the ONS area code (e.g. E08000003 for Manchester)
  const url = `https://www.nomisweb.co.uk/api/v01/dataset/NM_162_1/data.json?geography=TYPE463&measures=20100&time=latest&select=geography_name,obs_value,time_name`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const data = await res.json() as any;
    const rows: any[] = data?.obs ?? [];
    // Find the row matching our local authority by name
    const match = rows.find((r: any) =>
      (r.geography?.description || '').toLowerCase().includes(adminDistrict.toLowerCase())
    );
    if (!match) return null;
    return {
      rate: parseFloat(match.obs_value?.value ?? match.obs_value ?? '0'),
      area: match.geography?.description || adminDistrict,
      date: match.time?.description || '',
    };
  } catch {
    return null;
  }
}

async function fetchEPCData(postcode: string): Promise<EPCRecord[] | null> {
  const apiKey = process.env.EPC_API_KEY;
  const email = process.env.EPC_EMAIL;
  if (!apiKey || !email) return null;
  const creds = Buffer.from(`${email}:${apiKey}`).toString('base64');
  const encoded = encodeURIComponent(postcode.trim());
  const res = await fetch(
    `https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encoded}&size=25`,
    { headers: { Authorization: `Basic ${creds}`, Accept: 'application/json' }, signal: AbortSignal.timeout(7000) }
  );
  if (!res.ok) return null;
  const data = await res.json() as any;
  return (data?.rows ?? [])
    .map((r: any) => ({
      address: [r['address1'], r['address2']].filter(Boolean).join(', '),
      energyRating: r['current-energy-rating'] || '',
      floorArea: parseFloat(r['total-floor-area'] || r['floor-area'] || '0') || 0,
      inspectionDate: r['inspection-date'] || '',
    }))
    .filter((r: EPCRecord) => r.energyRating);
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  property: PropertyRequest,
  comparables: LRComparable[],
  postcodeInfo: PostcodeInfo | null,
  epcData: EPCRecord[] | null,
  crimeStats: CrimeStats | null,
  floodRisk: FloodRisk | null,
  unemployment: UnemploymentData | null,
): string {
  const leaseholdInfo =
    property.tenure === 'leasehold'
      ? `\n- Service charge: £${property.serviceCharge}/yr, Ground rent: £${property.groundRent}/yr, Lease remaining: ${property.leaseYears} years`
      : '';

  // ── Comparable stats ──────────────────────────────────────────────────────
  const cutoff3yr = new Date();
  cutoff3yr.setFullYear(cutoff3yr.getFullYear() - 3);
  const cutoff1yr = new Date();
  cutoff1yr.setFullYear(cutoff1yr.getFullYear() - 1);
  const cutoff2yr = new Date();
  cutoff2yr.setFullYear(cutoff2yr.getFullYear() - 2);

  const recent = comparables.filter((c) => new Date(c.date) >= cutoff3yr);
  const sameType = recent.filter((c) => c.propertyType === property.propertyType);
  const display = (sameType.length >= 3 ? sameType : recent).slice(0, 12);

  const avg = (arr: LRComparable[]) =>
    arr.length ? Math.round(arr.reduce((s, c) => s + c.price, 0) / arr.length) : null;

  const allAvg = avg(recent);
  const typeAvg = avg(sameType);
  const last12Avg = avg(recent.filter((c) => new Date(c.date) >= cutoff1yr));
  const prev12Avg = avg(recent.filter((c) => { const d = new Date(c.date); return d >= cutoff2yr && d < cutoff1yr; }));

  let trendLine = 'Insufficient data for trend';
  if (last12Avg && prev12Avg) {
    const pct = (((last12Avg - prev12Avg) / prev12Avg) * 100).toFixed(1);
    trendLine = `${Number(pct) >= 0 ? '+' : ''}${pct}% year-on-year (last 12m avg £${last12Avg.toLocaleString()} vs prior 12m £${prev12Avg.toLocaleString()})`;
  }

  const pricePct =
    typeAvg
      ? `${property.askingPrice > typeAvg ? '+' : ''}${(((property.askingPrice - typeAvg) / typeAvg) * 100).toFixed(1)}% vs comparable average`
      : 'N/A';

  const impliedPsqm =
    typeAvg && property.sizeSqm ? `~£${Math.round(typeAvg / property.sizeSqm).toLocaleString()}/sqm` : 'N/A';

  const comparableLines =
    display.length > 0
      ? display.map((c) => {
          const d = new Date(c.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
          return `  • ${c.address || 'Address not disclosed'}: £${c.price.toLocaleString()} (${d}, ${c.propertyType}, ${c.tenure}${c.newBuild ? ', new build' : ''})`;
        }).join('\n')
      : '  • No comparable sales found for this postcode in the last 3 years';

  // ── EPC stats ─────────────────────────────────────────────────────────────
  let epcSection = '';
  if (epcData && epcData.length > 0) {
    const withArea = epcData.filter((e) => e.floorArea > 0);
    const areaAvg = withArea.length ? Math.round(withArea.reduce((s, e) => s + e.floorArea, 0) / withArea.length) : 0;
    const ratings = epcData.map((e) => e.energyRating).filter(Boolean);
    const topRating = ratings.sort((a, b) => ratings.filter((v) => v === b).length - ratings.filter((v) => v === a).length)[0];
    epcSection = `
EPC Register (${epcData.length} certificates in postcode):
  • Most common energy rating: ${topRating}
  • Average floor area in this postcode: ${areaAvg ? areaAvg + ' sqm' : 'N/A'}
  • Subject property (${property.sizeSqm} sqm) is ${areaAvg ? `${Math.abs(property.sizeSqm - areaAvg)} sqm ${property.sizeSqm >= areaAvg ? 'above' : 'below'} postcode average` : 'N/A'}`;
  }

  // ── Area profile ──────────────────────────────────────────────────────────
  const areaLines = postcodeInfo ? [
    `  • Local authority: ${postcodeInfo.adminDistrict}${postcodeInfo.region ? ', ' + postcodeInfo.region : ''}`,
    postcodeInfo.ward ? `  • Ward: ${postcodeInfo.ward}` : '',
    postcodeInfo.constituency ? `  • Constituency: ${postcodeInfo.constituency}` : '',
    unemployment ? `  • Unemployment rate (${unemployment.area}, ${unemployment.date}): ${unemployment.rate.toFixed(1)}%` : '',
  ].filter(Boolean).join('\n') : '  • Area data unavailable';

  // ── Flood risk ────────────────────────────────────────────────────────────
  let floodSection = '';
  if (floodRisk) {
    const z3line = floodRisk.zone3
      ? '  • ⚠️ FLOOD ZONE 3 (HIGH RISK): >3.3% annual probability — major impact on insurance costs, mortgage availability, and resale value'
      : '  • Flood Zone 3 (high risk): NOT IN ZONE';
    const z2line = floodRisk.zone2
      ? '  • ⚠️ FLOOD ZONE 2 (MEDIUM RISK): 0.1–1% annual probability — insurance premiums likely elevated'
      : '  • Flood Zone 2 (medium risk): NOT IN ZONE';
    const summary = floodRisk.zone3
      ? '  • Assessment: HIGH FLOOD RISK — flag as red flag with significant financial impact'
      : floodRisk.zone2
      ? '  • Assessment: MEDIUM FLOOD RISK — flag as warning'
      : '  • Assessment: Low flood risk — positive factor';
    floodSection = `\nFlood Risk (Environment Agency):\n${z3line}\n${z2line}\n${summary}`;
  }

  // ── Crime stats ───────────────────────────────────────────────────────────
  let crimeSection = '';
  if (crimeStats && crimeStats.total > 0) {
    const catLines = crimeStats.topCategories
      .map((c) => `  • ${c.label}: ${c.count} (${c.pct}%)`)
      .join('\n');
    crimeSection = `\nCrime (Police UK, ${crimeStats.months}-month window, ~1 mile radius):
  • Total incidents: ${crimeStats.total} (~${crimeStats.perMonth}/month)
${catLines}`;
  } else if (crimeStats) {
    crimeSection = '\nCrime (Police UK): No incidents recorded in this area in the last 3 months';
  }

  return `You are a UK property valuation expert with access to real market data. Analyze this property using all data provided below.

PROPERTY:
- Address: ${property.address}, ${property.postcode}
- Asking price: £${property.askingPrice.toLocaleString()}
- Type: ${property.propertyType}, ${property.bedrooms} bed, ${property.sizeSqm} sqm, built ${property.yearBuilt}
- Tenure: ${property.tenure}${leaseholdInfo}

════════════ REAL MARKET DATA ════════════

Land Registry sold prices — ${property.postcode} (last 3 years, ${recent.length} total transactions):
${comparableLines}

Price statistics:
  • ${sameType.length} comparable ${property.propertyType}(s) sold in postcode (last 3 years)
  • Average sold price — all types: ${allAvg ? '£' + allAvg.toLocaleString() : 'N/A'}
  • Average sold price — ${property.propertyType}s: ${typeAvg ? '£' + typeAvg.toLocaleString() : 'N/A'}
  • Implied price per sqm (${property.propertyType}): ${impliedPsqm}
  • Asking price vs comparables: ${pricePct}
  • Price trend: ${trendLine}${epcSection}
${floodSection}
${crimeSection}

Area profile (Postcodes.io / ONS Nomis):
${areaLines}

══════════════════════════════════════════

Instructions:
- Base valuation on Land Registry comparables. Cite specific sold prices.
- If flood zone data shows risk, include it as a red flag or warning.
- Use crime data to inform red flags/warnings if rates are notably high.
- Unemployment rate context helps assess future price resilience.
- Confidence: HIGH (75–95) if ≥5 comparables, MEDIUM (45–74) if 2–4, LOW (20–44) if 0–1.

Respond with ONLY valid JSON, no other text:
{
  "valuation": {"amount": 287500, "confidence": 78},
  "verdict": "FAIR",
  "savings": 2500,
  "red_flags": [{"title": "...", "description": "...", "impact": 12000}],
  "warnings": [{"title": "...", "description": "...", "impact": 3000}],
  "positives": [{"title": "...", "description": "...", "impact": 5000}]
}

Rules:
- verdict: "GOOD_DEAL" | "FAIR" | "OVERPRICED"
- savings: asking − valuation (positive = buyer saves, negative = overpaying)
- confidence: 0–100 integer, impact: £ positive integers
- At least 2 items per category`;
}

// Serve built React frontend
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
}

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

    // Stage 1: postcode lookup (fast, ~200ms) — provides lat/lng for crime + flood
    const postcodeInfo = await fetchPostcodeInfo(property.postcode).catch(() => null);

    // Stage 2: all remaining sources in parallel
    const [lrResult, epcResult, crimeResult, floodResult, unemploymentResult] = await Promise.allSettled([
      fetchLRComparables(property.postcode),
      fetchEPCData(property.postcode),
      postcodeInfo?.latitude != null
        ? fetchCrimeStats(postcodeInfo.latitude, postcodeInfo.longitude!)
        : Promise.resolve(null),
      postcodeInfo?.latitude != null
        ? fetchFloodRisk(postcodeInfo.latitude, postcodeInfo.longitude!)
        : Promise.resolve(null),
      postcodeInfo?.adminDistrict
        ? fetchUnemployment(postcodeInfo.adminDistrictCode, postcodeInfo.adminDistrict)
        : Promise.resolve(null),
    ]);

    const comparables = lrResult.status === 'fulfilled' ? lrResult.value : [];
    const epcData = epcResult.status === 'fulfilled' ? epcResult.value : null;
    const crimeStats = crimeResult.status === 'fulfilled' ? crimeResult.value : null;
    const floodRisk = floodResult.status === 'fulfilled' ? floodResult.value : null;
    const unemployment = unemploymentResult.status === 'fulfilled' ? unemploymentResult.value : null;

    if (lrResult.status === 'rejected') console.warn('Land Registry:', lrResult.reason?.message);
    if (crimeResult.status === 'rejected') console.warn('Police UK:', crimeResult.reason?.message);
    if (floodResult.status === 'rejected') console.warn('Flood risk:', floodResult.reason?.message);

    const prompt = buildPrompt(property, comparables, postcodeInfo, epcData, crimeStats, floodRisk, unemployment);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse JSON from response');

    const analysis = JSON.parse(jsonMatch[0]);

    // Attach metadata so the frontend can show which data sources were used
    const recent3yr = comparables.filter((c) => {
      const cut = new Date(); cut.setFullYear(cut.getFullYear() - 3); return new Date(c.date) >= cut;
    });
    const sameType = recent3yr.filter((c) => c.propertyType === property.propertyType);
    analysis.dataSources = {
      landRegistry: recent3yr.length > 0 ? {
        total: recent3yr.length,
        sameType: sameType.length,
        avgPrice: sameType.length
          ? Math.round(sameType.reduce((s, c) => s + c.price, 0) / sameType.length)
          : (recent3yr.length ? Math.round(recent3yr.reduce((s, c) => s + c.price, 0) / recent3yr.length) : null),
      } : null,
      epc: !!(epcData && epcData.length > 0),
      postcode: !!postcodeInfo,
      crime: crimeStats ? { total: crimeStats.total, months: crimeStats.months } : null,
      floodRisk: floodRisk ?? null,
      unemployment: unemployment ? { rate: unemployment.rate, area: unemployment.area } : null,
    };

    res.json(analysis);
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

// Demo endpoint — always works, no API key needed; still fetches real data
app.post('/api/demo', rateLimit, async (req, res) => {
  const property: PropertyRequest = req.body;
  const price = property.askingPrice || 285000;

  // Fetch real data using the same pipeline as /api/analyze
  let postcodeInfo: PostcodeInfo | null = null;
  let comparables: LRComparable[] = [];
  let epcData: EPCRecord[] | null = null;
  let crimeStats: CrimeStats | null = null;
  let floodRisk: FloodRisk | null = null;
  let unemployment: UnemploymentData | null = null;

  try {
    postcodeInfo = await fetchPostcodeInfo(property.postcode).catch(() => null);
    const [lrResult, epcResult, crimeResult, floodResult, unemploymentResult] = await Promise.allSettled([
      fetchLRComparables(property.postcode),
      fetchEPCData(property.postcode),
      postcodeInfo?.latitude != null
        ? fetchCrimeStats(postcodeInfo.latitude, postcodeInfo.longitude!)
        : Promise.resolve(null),
      postcodeInfo?.latitude != null
        ? fetchFloodRisk(postcodeInfo.latitude, postcodeInfo.longitude!)
        : Promise.resolve(null),
      postcodeInfo?.adminDistrict
        ? fetchUnemployment(postcodeInfo.adminDistrictCode, postcodeInfo.adminDistrict)
        : Promise.resolve(null),
    ]);
    comparables = lrResult.status === 'fulfilled' ? lrResult.value : [];
    epcData    = epcResult.status === 'fulfilled' ? epcResult.value : null;
    crimeStats = crimeResult.status === 'fulfilled' ? crimeResult.value : null;
    floodRisk  = floodResult.status === 'fulfilled' ? floodResult.value : null;
    unemployment = unemploymentResult.status === 'fulfilled' ? unemploymentResult.value : null;
  } catch {
    // data fetch failed — fall back to hardcoded values below
  }

  // Derive valuation from real Land Registry data if available
  const cut = new Date(); cut.setFullYear(cut.getFullYear() - 3);
  const recent3yr = comparables.filter((c) => new Date(c.date) >= cut);
  const sameType  = recent3yr.filter((c) => c.propertyType === property.propertyType);
  const avgMarketPrice = sameType.length
    ? Math.round(sameType.reduce((s, c) => s + c.price, 0) / sameType.length)
    : recent3yr.length
      ? Math.round(recent3yr.reduce((s, c) => s + c.price, 0) / recent3yr.length)
      : null;

  const valuation = avgMarketPrice ?? Math.round(price * 0.965);
  const confidence = avgMarketPrice ? Math.min(90, 50 + recent3yr.length * 2) : 62;
  const priceDiff  = avgMarketPrice ? (price - avgMarketPrice) / avgMarketPrice : 0;
  const verdict    = priceDiff > 0.05 ? 'OVERPRICED' : priceDiff < -0.05 ? 'GOOD_DEAL' : 'FAIR';

  const dataSources = {
    landRegistry: recent3yr.length > 0 ? {
      total: recent3yr.length,
      sameType: sameType.length,
      avgPrice: avgMarketPrice,
    } : null,
    epc: !!(epcData && epcData.length > 0),
    postcode: !!postcodeInfo,
    crime: crimeStats ? { total: crimeStats.total, months: crimeStats.months } : null,
    floodRisk: floodRisk ?? null,
    unemployment: unemployment ? { rate: unemployment.rate, area: unemployment.area } : null,
  };

  res.json({
    valuation: { amount: valuation, confidence },
    verdict,
    savings: price - valuation,
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
    dataSources,
  });
});

// ---------------------------------------------------------------------------
// Helpers for parse-listing
// ---------------------------------------------------------------------------

/** Extract a JSON object from html starting at the first { after `marker`.
 *  Uses brace-counting so nested objects are handled correctly. */
function extractJsonAfter(html: string, marker: string): any {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = html.indexOf('{', markerIdx);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/** Extract content of a <meta> tag by property or name attribute. */
function metaContent(html: string, attr: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${attr}["'][^>]*content=["']([^"']+)["']`, 'i');
  const m = html.match(re) || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${attr}["']`, 'i'));
  return m ? m[1].trim() : null;
}

/** Normalise a property type string to our select option values. */
function normaliseType(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes('flat') || s.includes('apartment') || s.includes('studio')) return 'flat';
  if (s.includes('detached') && s.includes('semi')) return 'semi-detached';
  if (s.includes('detached')) return 'detached';
  if (s.includes('terraced') || s.includes('terrace') || s.includes('end of terrace')) return 'terraced';
  if (s.includes('bungalow')) return 'bungalow';
  return 'flat';
}

type Extracted = Partial<{
  address: string; postcode: string; askingPrice: number;
  propertyType: string; bedrooms: number; sizeSqm: number;
  yearBuilt: number; tenure: string;
  serviceCharge: number; groundRent: number; leaseYears: number;
}>;

function applyRmPropertyData(prop: any, out: Extracted) {
  if (prop.prices?.primaryPrice) {
    const n = parseInt(String(prop.prices.primaryPrice).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > 0) out.askingPrice = n;
  }
  if (prop.address?.displayAddress) out.address = prop.address.displayAddress;
  if (prop.address?.outcode) {
    out.postcode = `${prop.address.outcode}${prop.address.incode ? ' ' + prop.address.incode : ''}`;
  }
  if (typeof prop.bedrooms === 'number') out.bedrooms = prop.bedrooms;
  if (prop.propertySubType) out.propertyType = normaliseType(prop.propertySubType);
  if (typeof prop.sizeSqFeet === 'number') out.sizeSqm = Math.round(prop.sizeSqFeet * 0.0929);
  if (prop.tenure?.tenureName) {
    out.tenure = prop.tenure.tenureName.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';
  }
  if (typeof prop.tenure?.yearsRemainingOnLease === 'number') {
    out.leaseYears = prop.tenure.yearsRemainingOnLease;
  }
}

function applyJsonLd(schema: any, out: Extracted) {
  // schema.org/Residence or similar
  const price = schema?.offers?.price ?? schema?.price;
  if (price && !out.askingPrice) {
    const n = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > 0) out.askingPrice = n;
  }
  const addr = schema?.address;
  if (addr && !out.address) {
    out.address = [addr.streetAddress, addr.addressLocality].filter(Boolean).join(', ');
  }
  if (addr?.postalCode && !out.postcode) out.postcode = addr.postalCode;
  if (schema?.numberOfRooms && !out.bedrooms) out.bedrooms = parseInt(schema.numberOfRooms, 10);
  if (schema?.floorSize?.value && !out.sizeSqm) {
    const v = parseFloat(schema.floorSize.value);
    out.sizeSqm = schema.floorSize.unitCode === 'FTK' ? Math.round(v * 0.0929) : Math.round(v);
  }
}

function postcodeFallback(html: string, out: Extracted) {
  if (!out.postcode) {
    const m = html.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/);
    if (m) out.postcode = m[1].toUpperCase();
  }
}

// ---------------------------------------------------------------------------
// Parse-listing endpoint
// ---------------------------------------------------------------------------
app.post('/api/parse-listing', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') { res.status(400).json({ error: 'Missing url' }); return; }

  let parsedUrl: URL;
  try { parsedUrl = new URL(url); } catch { res.status(400).json({ error: 'Invalid URL' }); return; }

  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  if (hostname !== 'rightmove.co.uk' && hostname !== 'zoopla.co.uk') {
    res.status(400).json({ error: 'Only Rightmove and Zoopla URLs are supported' });
    return;
  }

  // Strip fragment — fragments are client-side only and confuse server fetch
  const fetchUrl = `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}`;

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };

  let html: string;
  try {
    const response = await fetch(fetchUrl, { headers: browserHeaders, signal: AbortSignal.timeout(12000) });
    if (!response.ok) {
      res.status(502).json({ error: `Listing page returned HTTP ${response.status}. The site may be blocking automated access.` });
      return;
    }
    html = await response.text();
  } catch (err: any) {
    res.status(502).json({ error: `Failed to fetch listing: ${err.message}` });
    return;
  }

  const out: Extracted = {};

  // ── Source 1: __NEXT_DATA__ (Next.js — used by both sites in newer versions)
  const nextData = extractJsonAfter(html, '"__NEXT_DATA__"') || extractJsonAfter(html, '__NEXT_DATA__');
  if (nextData) {
    const props = nextData?.props?.pageProps;
    // Rightmove Next.js shape
    const rmProp = props?.propertyData ?? props?.property ?? props?.listing?.property;
    if (rmProp) applyRmPropertyData(rmProp, out);
    // Zoopla Next.js shape
    const zoopListing = props?.listingDetails ?? props?.listing;
    if (zoopListing && !out.askingPrice) {
      const price = zoopListing.price?.amount ?? zoopListing.pricing?.price ?? zoopListing.askingPrice;
      if (price) out.askingPrice = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
      if (zoopListing.address?.displayAddress && !out.address) out.address = zoopListing.address.displayAddress;
      if (zoopListing.address?.postcode && !out.postcode) out.postcode = zoopListing.address.postcode;
      const beds = zoopListing.numBedrooms ?? zoopListing.bedrooms ?? zoopListing.details?.numBedrooms;
      if (beds && !out.bedrooms) out.bedrooms = parseInt(String(beds), 10);
      const tenure = zoopListing.details?.tenure ?? zoopListing.tenure ?? '';
      if (tenure && !out.tenure) out.tenure = tenure.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';
      const area = zoopListing.details?.floorArea ?? zoopListing.floorArea;
      if (area?.value && !out.sizeSqm) {
        out.sizeSqm = (area.units === 'sqm' || area.unitCode === 'MTK')
          ? Math.round(area.value)
          : Math.round(area.value * 0.0929);
      }
    }
  }

  // ── Source 2: window.PAGE_MODEL (classic Rightmove)
  if (!out.askingPrice) {
    const pageModel = extractJsonAfter(html, 'window.PAGE_MODEL');
    if (pageModel?.propertyData) applyRmPropertyData(pageModel.propertyData, out);
  }

  // ── Source 3: window.__PRELOADED_STATE__ (classic Zoopla)
  if (!out.askingPrice) {
    const preloaded = extractJsonAfter(html, 'window.__PRELOADED_STATE__');
    if (preloaded) {
      const listing = preloaded?.listing?.listingDetails ?? preloaded?.propertyDetails;
      if (listing) {
        const price = listing.price?.amount ?? listing.pricing?.price;
        if (price) out.askingPrice = parseInt(String(price).replace(/[^0-9]/g, ''), 10);
        if (listing.address?.displayAddress) out.address = listing.address.displayAddress;
        if (listing.address?.postcode) out.postcode = listing.address.postcode;
        const beds = listing.numBedrooms ?? listing.details?.numBedrooms;
        if (beds) out.bedrooms = parseInt(String(beds), 10);
        if (listing.details?.tenure) {
          out.tenure = listing.details.tenure.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';
        }
        const area = listing.details?.floorArea;
        if (area?.value) out.sizeSqm = area.units === 'sqm' ? Math.round(area.value) : Math.round(area.value * 0.0929);
      }
    }
  }

  // ── Source 4: JSON-LD schema.org
  if (!out.askingPrice) {
    const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      try {
        const schema = JSON.parse(m[1]);
        const items = Array.isArray(schema) ? schema : [schema];
        for (const item of items) {
          applyJsonLd(item, out);
          if (out.askingPrice) break;
        }
      } catch { /* skip */ }
      if (out.askingPrice) break;
    }
  }

  // ── Source 5: OG / meta tags
  if (!out.askingPrice) {
    const ogDesc = metaContent(html, 'og:description') ?? metaContent(html, 'description') ?? '';
    const priceM = ogDesc.match(/£\s*([\d,]+)/);
    if (priceM) out.askingPrice = parseInt(priceM[1].replace(/,/g, ''), 10);
  }
  if (!out.address) {
    const ogTitle = metaContent(html, 'og:title') ?? '';
    if (ogTitle) out.address = ogTitle.replace(/\s*[|\-–].*$/, '').trim();
  }
  if (!out.bedrooms) {
    const desc = metaContent(html, 'og:description') ?? metaContent(html, 'description') ?? html;
    const m = desc.match(/(\d+)\s*bed(?:room)?/i);
    if (m) out.bedrooms = parseInt(m[1], 10);
  }
  if (!out.propertyType) {
    const desc = metaContent(html, 'og:description') ?? metaContent(html, 'description') ?? html.slice(0, 5000);
    const types = ['flat', 'apartment', 'studio', 'detached', 'semi-detached', 'terraced', 'bungalow'];
    for (const t of types) {
      if (desc.toLowerCase().includes(t)) { out.propertyType = normaliseType(t); break; }
    }
  }

  // ── Source 6: last-resort plain-text regex across the full HTML
  if (!out.askingPrice) {
    const m = html.match(/£\s*([\d,]{5,})/);
    if (m) out.askingPrice = parseInt(m[1].replace(/,/g, ''), 10);
  }
  postcodeFallback(html, out);
  if (!out.tenure) {
    if (/leasehold/i.test(html)) out.tenure = 'leasehold';
    else if (/freehold/i.test(html)) out.tenure = 'freehold';
  }
  if (!out.sizeSqm) {
    const m = html.match(/(\d{2,4})\s*sq\.?\s*(?:m|metres?|meters?)\b/i);
    if (m) out.sizeSqm = parseInt(m[1], 10);
    else {
      const sqft = html.match(/(\d{3,5})\s*sq\.?\s*ft/i);
      if (sqft) out.sizeSqm = Math.round(parseInt(sqft[1], 10) * 0.0929);
    }
  }
  if (!out.leaseYears) {
    const m = html.match(/(\d{2,4})\s*year(?:s)?\s*(?:remaining|left)\s*(?:on\s+)?(?:the\s+)?lease/i);
    if (m) out.leaseYears = parseInt(m[1], 10);
  }

  // Strip any keys that are NaN / null / undefined / zero strings
  (Object.keys(out) as (keyof Extracted)[]).forEach((k) => {
    const v = out[k];
    if (v === undefined || v === null) { delete out[k]; return; }
    if (typeof v === 'number' && isNaN(v)) { delete out[k]; return; }
  });

  res.json(out);
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
