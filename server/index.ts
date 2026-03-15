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

    const leaseholdInfo =
      property.tenure === 'leasehold'
        ? `\n- Service charge: £${property.serviceCharge}/yr, Ground rent: £${property.groundRent}/yr, Lease remaining: ${property.leaseYears} years`
        : '';

    const prompt = `You are a UK property valuation expert. Analyze this UK property and provide a detailed assessment.

Property Details:
- Address: ${property.address}, ${property.postcode}
- Asking Price: £${property.askingPrice.toLocaleString()}
- Type: ${property.propertyType}, ${property.bedrooms} bedrooms, ${property.sizeSqm}sqm
- Year Built: ${property.yearBuilt}
- Tenure: ${property.tenure}${leaseholdInfo}

Provide a thorough analysis considering:
1. Fair market valuation based on location, size, type, and local market conditions
2. Red flags - serious issues with financial impact >£5,000
3. Warnings - moderate concerns with £1,000-£5,000 impact
4. Positive factors - features that add value or reduce risk

Be realistic and specific to the UK property market. Consider postcode-specific factors.

You MUST respond with ONLY valid JSON in this exact format, no other text:
{
  "valuation": {"amount": 287500, "confidence": 3.2},
  "verdict": "FAIR",
  "savings": 2500,
  "red_flags": [{"title": "Example Issue", "description": "Detailed explanation", "impact": 12000}],
  "warnings": [{"title": "Example Warning", "description": "Detailed explanation", "impact": 3000}],
  "positives": [{"title": "Example Positive", "description": "Detailed explanation", "impact": 5000}]
}

Where:
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
  const valuation = Math.round(price * 0.965);

  res.json({
    valuation: { amount: valuation, confidence: 3.2 },
    verdict: 'FAIR',
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
  });
});

// Parse a Rightmove or Zoopla listing URL and extract property data
app.post('/api/parse-listing', async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url' });
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, '');
  if (hostname !== 'rightmove.co.uk' && hostname !== 'zoopla.co.uk') {
    res.status(400).json({ error: 'Only Rightmove and Zoopla URLs are supported' });
    return;
  }

  let html: string;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      res.status(502).json({ error: `Listing page returned ${response.status}. The site may be blocking automated access.` });
      return;
    }
    html = await response.text();
  } catch (err: any) {
    res.status(502).json({ error: `Failed to fetch listing: ${err.message}` });
    return;
  }

  const extracted: Partial<{
    address: string; postcode: string; askingPrice: number;
    propertyType: string; bedrooms: number; sizeSqm: number;
    yearBuilt: number; tenure: string;
    serviceCharge: number; groundRent: number; leaseYears: number;
  }> = {};

  if (hostname === 'rightmove.co.uk') {
    // Rightmove embeds window.PAGE_MODEL JSON in a script tag
    const modelMatch = html.match(/window\.PAGE_MODEL\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (modelMatch) {
      try {
        const model = JSON.parse(modelMatch[1]);
        const prop = model?.propertyData;
        if (prop) {
          extracted.askingPrice = prop.prices?.primaryPrice
            ? parseInt(String(prop.prices.primaryPrice).replace(/[^0-9]/g, ''), 10)
            : undefined;
          extracted.address = prop.address?.displayAddress;
          extracted.postcode = prop.address?.outcode
            ? `${prop.address.outcode} ${prop.address.incode || ''}`.trim()
            : undefined;
          extracted.bedrooms = prop.bedrooms;
          extracted.propertyType = prop.propertySubType?.toLowerCase().replace(/ /g, '-');
          const sqft = prop.floorplanImages?.[0]?.resizedFloorplanUrls?.find(() => true);
          if (prop.sizeSqFeet) extracted.sizeSqm = Math.round(prop.sizeSqFeet * 0.0929);
          extracted.tenure = prop.tenure?.tenureName?.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';
          extracted.leaseYears = prop.tenure?.yearsRemainingOnLease;
        }
      } catch { /* fallback to regex */ }
    }

    // Regex fallbacks
    if (!extracted.askingPrice) {
      const m = html.match(/["']price["']:\s*["']?(\d[\d,]+)["']?/);
      if (m) extracted.askingPrice = parseInt(m[1].replace(/,/g, ''), 10);
    }
    if (!extracted.bedrooms) {
      const m = html.match(/(\d+)\s+bedroom/i);
      if (m) extracted.bedrooms = parseInt(m[1], 10);
    }
    if (!extracted.address) {
      const m = html.match(/<title>([^|<]+)/);
      if (m) extracted.address = m[1].trim();
    }
    if (!extracted.postcode) {
      const m = html.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
      if (m) extracted.postcode = m[1].toUpperCase();
    }
  } else {
    // Zoopla — try __PRELOADED_STATE__ or JSON-LD
    const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});\s*\n/);
    if (stateMatch) {
      try {
        const state = JSON.parse(stateMatch[1]);
        const listing = state?.listing?.listingDetails || state?.propertyDetails;
        if (listing) {
          extracted.askingPrice = listing.price?.amount ?? listing.pricing?.price;
          extracted.address = listing.address?.displayAddress;
          extracted.postcode = listing.address?.postcode;
          extracted.bedrooms = listing.numBedrooms ?? listing.details?.numBedrooms;
          extracted.tenure = listing.details?.tenure?.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';
          if (listing.details?.floorArea?.value) {
            const area = listing.details.floorArea;
            extracted.sizeSqm = area.units === 'sqm' ? area.value : Math.round(area.value * 0.0929);
          }
        }
      } catch { /* fallback */ }
    }

    if (!extracted.askingPrice) {
      const m = html.match(/["']price["']:\s*["']?(\d[\d,]+)["']?/);
      if (m) extracted.askingPrice = parseInt(m[1].replace(/,/g, ''), 10);
    }
    if (!extracted.bedrooms) {
      const m = html.match(/(\d+)\s+bedroom/i);
      if (m) extracted.bedrooms = parseInt(m[1], 10);
    }
    if (!extracted.postcode) {
      const m = html.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})\b/i);
      if (m) extracted.postcode = m[1].toUpperCase();
    }
    if (!extracted.address) {
      const m = html.match(/<title>([^|<]+)/);
      if (m) extracted.address = m[1].trim();
    }
  }

  // Clean up undefined values
  Object.keys(extracted).forEach((k) => {
    if ((extracted as any)[k] === undefined || (extracted as any)[k] === null || isNaN((extracted as any)[k])) {
      delete (extracted as any)[k];
    }
  });

  res.json(extracted);
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
