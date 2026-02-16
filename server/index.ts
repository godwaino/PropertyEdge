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

    const leaseholdInfo =
      property.tenure === 'leasehold'
        ? `\n- Service charge: £${property.serviceCharge}/yr, Ground rent: £${property.groundRent}/yr, Lease remaining: ${property.leaseYears} years`
        : '';

    const prompt = `You are a UK property valuation expert with deep knowledge of UK property prices, Land Registry sold prices, and local market conditions.

Property Details:
- Address: ${property.address}, ${property.postcode}
- Asking Price: £${property.askingPrice.toLocaleString()}
- Type: ${property.propertyType}, ${property.bedrooms} bedrooms, ${property.sizeSqm}sqm
- Year Built: ${property.yearBuilt}
- Tenure: ${property.tenure}${leaseholdInfo}

VALUATION METHODOLOGY — you must follow these steps:
1. Identify the postcode district (e.g. M3, SW1, E14) and consider what similar properties actually sell for there.
2. Calculate a £/sqm rate typical for ${property.propertyType}s in ${property.postcode}. Use your knowledge of UK Land Registry data and sold prices.
3. Apply adjustments for: number of bedrooms, year built, tenure, condition typical for age, lease length if leasehold, service charges.
4. Your valuation MUST be an independent figure derived from comparable evidence — do NOT simply adjust the asking price by a percentage. The valuation can be significantly above or below the asking price.
5. Set confidence as a percentage range (e.g. 8.5 means +/- 8.5%). Lower confidence = more certain. Use 5-10 for areas you know well, 10-20 for unusual properties.

IMPORTANT:
- Your valuation should reflect what this property would ACTUALLY sell for based on comparable sales in the area.
- If the asking price seems too high or too low for the area, say so clearly.
- A £${property.askingPrice.toLocaleString()} ${property.bedrooms}-bed ${property.propertyType} in ${property.postcode} — think carefully about whether this price makes sense for this specific location.

Also analyze:
- Red flags: serious issues with financial impact >£5,000
- Warnings: moderate concerns with £1,000-£5,000 impact
- Positives: features that add value or reduce risk

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "valuation": {"amount": 287500, "confidence": 8.5, "basis": "Similar 2-bed flats in M3 sold for £280k-£300k in 2024. At £3,350/sqm this is in line with recent sales."},
  "verdict": "FAIR",
  "savings": 2500,
  "red_flags": [{"title": "Example Issue", "description": "Detailed explanation with specifics", "impact": 12000}],
  "warnings": [{"title": "Example Warning", "description": "Detailed explanation with specifics", "impact": 3000}],
  "positives": [{"title": "Example Positive", "description": "Detailed explanation with specifics", "impact": 5000}]
}

Where:
- valuation.basis explains HOW you arrived at the figure (comparables, £/sqm, adjustments)
- verdict is one of: "GOOD_DEAL", "FAIR", or "OVERPRICED"
- savings is the difference between asking price and your valuation (positive = buyer saves, negative = premium)
- impact values are in £ (positive numbers)
- Include at least 2 items in each category
- Be specific about the location and realistic about UK property values`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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

// Demo endpoint — always works, no API key needed
app.post('/api/demo', rateLimit, (req, res) => {
  const property: PropertyRequest = req.body;
  const price = property.askingPrice || 285000;

  // Estimate £/sqm based on property type and a simple postcode heuristic
  const postcodePrefix = (property.postcode || '').split(/\d/)[0].toUpperCase();
  // Rough average £/sqm by area tier (central London, outer London, major cities, elsewhere)
  const centralLondon = ['SW', 'W', 'WC', 'EC', 'SE1', 'NW1', 'N1'];
  const outerLondon = ['E', 'N', 'NW', 'SE', 'BR', 'CR', 'DA', 'EN', 'HA', 'IG', 'KT', 'RM', 'SM', 'TW', 'UB'];
  const majorCities = ['M', 'B', 'LS', 'BS', 'EH', 'G', 'CF', 'L', 'NE', 'NG', 'S'];

  let basePsm: number;
  if (centralLondon.some(p => postcodePrefix.startsWith(p))) basePsm = 9500;
  else if (outerLondon.some(p => postcodePrefix.startsWith(p))) basePsm = 5500;
  else if (majorCities.some(p => postcodePrefix.startsWith(p))) basePsm = 3200;
  else basePsm = 2400;

  // Adjust for property type
  const typeMultiplier: Record<string, number> = { flat: 1.0, terraced: 0.95, 'semi-detached': 0.9, detached: 1.05, bungalow: 0.85 };
  basePsm *= typeMultiplier[property.propertyType] || 1.0;

  // Adjust for age (newer = slight premium)
  const age = 2025 - (property.yearBuilt || 2000);
  if (age < 5) basePsm *= 1.08;
  else if (age < 15) basePsm *= 1.03;
  else if (age > 50) basePsm *= 0.92;

  // Leasehold discount for short leases
  if (property.tenure === 'leasehold' && property.leaseYears && property.leaseYears < 80) {
    basePsm *= 0.85;
  }

  const sqm = property.sizeSqm || 75;
  const valuation = Math.round(basePsm * sqm / 1000) * 1000; // Round to nearest £1,000
  const savings = price - valuation;
  let verdict: string;
  if (savings > price * 0.05) verdict = 'OVERPRICED';
  else if (savings < -price * 0.03) verdict = 'GOOD_DEAL';
  else verdict = 'FAIR';

  res.json({
    valuation: { amount: valuation, confidence: 12, basis: `Estimated at £${Math.round(basePsm).toLocaleString()}/sqm for ${property.propertyType || 'flat'}s in ${property.postcode || 'this area'}, based on ${sqm}sqm. Demo mode — add an API key for AI-researched valuations.` },
    verdict,
    savings,
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
