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

// Format comparables into a text summary for the AI prompt
function formatComparables(sales: ComparableSale[], propertyType: string): string {
  if (sales.length === 0) return '';

  // Filter to same property type if possible
  const sameType = sales.filter(s => s.propertyType.includes(propertyType.split('-')[0]));
  const relevantSales = sameType.length >= 3 ? sameType : sales;

  const lines = relevantSales.slice(0, 15).map(s =>
    `  - £${s.price.toLocaleString()} | ${s.date} | ${s.address} | ${s.propertyType}${s.newBuild ? ' (new build)' : ''}`
  );

  const prices = relevantSales.map(s => s.price);
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return `
REAL COMPARABLE SALES (HM Land Registry Price Paid Data):
${lines.join('\n')}

Summary: ${relevantSales.length} recent sales found. Range: £${minPrice.toLocaleString()} - £${maxPrice.toLocaleString()}. Average: £${avgPrice.toLocaleString()}.
YOU MUST base your valuation primarily on this real data, NOT on general assumptions. Adjust for size, condition, and specifics.`;
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

    // Fetch real comparable sales from Land Registry
    const comparables = await fetchComparables(property.postcode);
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
  "valuation": {"amount": 287500, "confidence": 8.5, "basis": "Based on 12 Land Registry sales in M3: similar 2-bed flats sold for £270k-£310k."},
  "summary": "Fair deal at £287k — in line with recent 2-bed flat sales in M3, but service charges are high.",
  "negotiation": {"offer_low": 270000, "offer_high": 285000, "walk_away": 300000, "reasoning": "Comps support £280-290k. Open at £270k citing higher-than-average service charges, aim for £285k."},
  "comparables_used": 12,
  "red_flags": [{"title": "Issue", "description": "Detailed explanation", "impact": 12000}],
  "warnings": [{"title": "Warning", "description": "Detailed explanation", "impact": 3000}],
  "positives": [{"title": "Positive", "description": "Detailed explanation", "impact": 5000}]
}

Where:
- valuation.amount is your independent fair market valuation in £
- valuation.basis explains which comparables/data informed the figure
- summary is ONE sentence: "Overall: [verdict] at £X because [top 2 reasons]"
- negotiation.offer_low = aggressive opening offer, offer_high = fair offer, walk_away = absolute max
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

    // Attach raw comparables for the frontend table
    analysis.comparables = comparables.slice(0, 10).map((c: any) => ({
      price: c.price,
      date: c.date,
      address: c.address,
      propertyType: c.propertyType,
    }));

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

  // Fetch real comparable sales from Land Registry
  const comparables = await fetchComparables(property.postcode || '');

  let valuation: number;
  let basisText: string;
  let comparablesUsed = 0;

  if (comparables.length >= 3) {
    // Use real Land Registry data to derive valuation
    const sameType = comparables.filter(s =>
      s.propertyType.includes((property.propertyType || '').split('-')[0])
    );
    const relevantSales = sameType.length >= 3 ? sameType : comparables;
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

  const verdictLabel = verdict === 'GOOD_DEAL' ? 'Good deal' : verdict === 'OVERPRICED' ? 'Overpriced' : 'Fair';
  const summaryText = `${verdictLabel} at £${valuation.toLocaleString()} — ${comparablesUsed > 0 ? `based on ${comparablesUsed} recent Land Registry sales in ${property.postcode}` : 'estimated from area averages'}. ${savings > 0 ? 'Asking price is above our valuation.' : 'Asking price is in line with or below market value.'}`;

  res.json({
    valuation: { amount: valuation, confidence: comparables.length >= 3 ? 10 : 15, basis: basisText },
    verdict,
    savings,
    summary: summaryText,
    comparables_used: comparablesUsed,
    comparables: comparables.slice(0, 10).map(c => ({
      price: c.price,
      date: c.date,
      address: c.address,
      propertyType: c.propertyType,
    })),
    negotiation: {
      offer_low: offerLow,
      offer_high: offerHigh,
      walk_away: walkAway,
      reasoning: `Open at £${offerLow.toLocaleString()} (8% below valuation) citing any issues found. Aim for £${offerHigh.toLocaleString()}. Walk away above £${walkAway.toLocaleString()}. Demo mode — add API key for AI-tailored negotiation strategy.`,
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
