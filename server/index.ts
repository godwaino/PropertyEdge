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

// Helper: map property type string to our enum values
function mapPropertyType(typeStr: string): string {
  const t = typeStr.toLowerCase();
  if (t.includes('flat') || t.includes('apartment') || t.includes('maisonette')) return 'flat';
  if (t.includes('terraced')) return 'terraced';
  if (t.includes('semi')) return 'semi-detached';
  if (t.includes('detached')) return 'detached';
  if (t.includes('bungalow')) return 'bungalow';
  return 'flat';
}

// Helper: try to extract property data from HTML (PAGE_MODEL, og tags, meta tags)
function extractFromHtml(html: string): Partial<PropertyRequest> {
  const property: Partial<PropertyRequest> = {};

  // Strategy 1: PAGE_MODEL JSON
  const pageModelMatch = html.match(/window\.PAGE_MODEL\s*=\s*(\{[\s\S]*?\})\s*<\/script>/);
  if (pageModelMatch) {
    try {
      const model = JSON.parse(pageModelMatch[1]);
      const pd = model?.propertyData;
      if (pd) {
        property.address = pd.address?.displayAddress || '';
        property.postcode = pd.address?.outcode && pd.address?.incode
          ? `${pd.address.outcode} ${pd.address.incode}` : '';
        property.askingPrice = pd.prices?.primaryPrice
          ? Number(pd.prices.primaryPrice.replace(/[^0-9]/g, '')) : 0;
        property.bedrooms = pd.bedrooms || 0;
        property.sizeSqm = pd.sizings?.[0]?.minimumSize || pd.sizings?.[0]?.maximumSize || 0;
        if (pd.sizings?.[0]?.unit === 'sqft' && property.sizeSqm) {
          property.sizeSqm = Math.round(property.sizeSqm * 0.0929);
        }
        property.propertyType = mapPropertyType(pd.propertySubType || pd.propertyType || '');
        const tenureStr = (pd.tenure?.tenureType || '').toLowerCase();
        property.tenure = tenureStr.includes('freehold') ? 'freehold' : 'leasehold';
      }
    } catch { /* fall through */ }
  }

  // Strategy 2: Open Graph meta tags (often served even to bots)
  if (!property.address) {
    const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1]
      || html.match(/content="([^"]+)"\s+(?:property|name)="og:title"/i)?.[1];
    if (ogTitle) {
      const addressMatch = ogTitle.match(/(?:for sale|to rent)\s+(?:in\s+)?(.+?)(?:\s*-\s*Rightmove|\s*\||$)/i);
      if (addressMatch) property.address = addressMatch[1].trim();
      const bedMatch = ogTitle.match(/(\d+)\s*bed/i);
      if (bedMatch) property.bedrooms = Number(bedMatch[1]);
      const typeMatch = ogTitle.match(/(flat|apartment|terraced|semi-detached|detached|bungalow|house|maisonette)/i);
      if (typeMatch) property.propertyType = mapPropertyType(typeMatch[1]);
    }
  }

  const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1]
    || html.match(/content="([^"]+)"\s+(?:property|name)="og:description"/i)?.[1];
  if (ogDesc) {
    if (!property.askingPrice) {
      const priceMatch = ogDesc.match(/£([\d,]+)/);
      if (priceMatch) property.askingPrice = Number(priceMatch[1].replace(/,/g, ''));
    }
    if (!property.bedrooms) {
      const bedMatch = ogDesc.match(/(\d+)\s*bed/i);
      if (bedMatch) property.bedrooms = Number(bedMatch[1]);
    }
  }

  // Strategy 3: <title> tag
  if (!property.address) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      const title = titleMatch[1];
      const addressMatch = title.match(/(?:for sale|to rent)\s+(?:in\s+)?(.+?)(?:\s*-\s*Rightmove|\s*\|)/i);
      if (addressMatch) property.address = addressMatch[1].trim();
      if (!property.bedrooms) {
        const bedMatch = title.match(/(\d+)\s*bed/i);
        if (bedMatch) property.bedrooms = Number(bedMatch[1]);
      }
    }
  }

  // Strategy 4: JSON-LD structured data
  const jsonLdMatch = html.match(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const ld = JSON.parse(jsonLdMatch[1]);
      if (!property.address && ld.name) property.address = ld.name;
      if (!property.askingPrice && ld.offers?.price) property.askingPrice = Number(ld.offers.price);
    } catch { /* ignore */ }
  }

  // Strategy 5: generic price/postcode patterns
  if (!property.askingPrice) {
    const priceMatch = html.match(/"price"\s*:\s*"([^"]+)"/) || html.match(/£([\d,]+)/);
    if (priceMatch) property.askingPrice = Number(priceMatch[1].replace(/[^0-9]/g, ''));
  }
  if (!property.postcode) {
    const postcodeMatch = html.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i);
    if (postcodeMatch) property.postcode = postcodeMatch[1];
  }

  return property;
}

// Helper: extract info from the Rightmove URL slug itself
function extractFromUrl(url: string): Partial<PropertyRequest> {
  const property: Partial<PropertyRequest> = {};
  // URLs like: /properties/154372691#/?channel=RES_BUY
  // or: /properties/2-bedroom-flat-for-sale-in-some-address-154372691
  const slug = decodeURIComponent(url).toLowerCase();
  const bedMatch = slug.match(/(\d+)-bed(?:room)?/);
  if (bedMatch) property.bedrooms = Number(bedMatch[1]);
  const typeMatch = slug.match(/(flat|apartment|terraced|semi-detached|detached|bungalow|house|maisonette)/);
  if (typeMatch) property.propertyType = mapPropertyType(typeMatch[1]);
  return property;
}

// Rightmove listing scraper endpoint
app.post('/api/rightmove', rateLimit, async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing URL', message: 'Please provide a Rightmove URL.' });
    return;
  }

  if (!/^https?:\/\/(www\.)?rightmove\.co\.uk\/propert/i.test(url)) {
    res.status(400).json({ error: 'Invalid URL', message: 'Please provide a valid Rightmove property URL.' });
    return;
  }

  try {
    // Extract what we can from the URL itself
    const urlData = extractFromUrl(url);
    let htmlData: Partial<PropertyRequest> = {};

    // Try fetching the page with multiple strategies
    const fetchStrategies: Record<string, string>[] = [
      // Strategy A: Googlebot (sites serve full content for SEO)
      {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html',
      },
      // Strategy B: Regular browser
      {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      // Strategy C: curl-like (minimal)
      {
        'User-Agent': 'curl/8.0',
        'Accept': '*/*',
      },
    ];

    for (const headers of fetchStrategies) {
      try {
        const response = await fetch(url, { headers, redirect: 'follow' });
        if (!response.ok) continue;

        const html = await response.text();
        htmlData = extractFromHtml(html);

        // If we got meaningful data, stop trying
        if (htmlData.address || htmlData.askingPrice) break;
      } catch {
        continue;
      }
    }

    // Merge: HTML data takes priority, URL data fills gaps
    const property: Partial<PropertyRequest> = {
      ...urlData,
      ...Object.fromEntries(Object.entries(htmlData).filter(([, v]) => v)),
    };

    // If scraping got nothing useful, try Claude as a last resort
    if (!property.address && !property.askingPrice && anthropic) {
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 512,
          messages: [{
            role: 'user',
            content: `I have a Rightmove property listing URL: ${url}
Extract any property details you can determine from the URL structure alone (property ID, area, bedrooms, property type).
Respond with ONLY valid JSON: {"address":"","postcode":"","askingPrice":0,"bedrooms":0,"propertyType":"flat","tenure":"freehold","sizeSqm":0,"yearBuilt":2000}
Fill in what you can infer, leave defaults for unknowns. Do not make up specific prices or addresses you aren't confident about.`,
          }],
        });
        const text = msg.content[0];
        if (text.type === 'text') {
          const jsonMatch = text.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiData = JSON.parse(jsonMatch[0]);
            // Only use AI data for fields we don't already have
            for (const [key, value] of Object.entries(aiData)) {
              if (value && !(property as any)[key]) {
                (property as any)[key] = value;
              }
            }
          }
        }
      } catch (aiErr: any) {
        console.error('Claude extraction fallback error:', aiErr?.message);
      }
    }

    // Set defaults for missing fields
    property.yearBuilt = property.yearBuilt || 2000;
    property.sizeSqm = property.sizeSqm || 0;
    property.tenure = property.tenure || 'freehold';
    property.propertyType = property.propertyType || 'flat';
    property.bedrooms = property.bedrooms || 0;

    if (!property.address && !property.askingPrice) {
      res.status(422).json({
        error: 'Could not extract details',
        message: 'Rightmove blocked all attempts. Please enter the property details manually.',
        partial: property,
      });
      return;
    }

    res.json(property);
  } catch (error: any) {
    console.error('Rightmove scrape error:', error?.message);
    res.status(500).json({
      error: 'Scrape failed',
      message: 'Could not fetch Rightmove listing. Please enter details manually.',
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
