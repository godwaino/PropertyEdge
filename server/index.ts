import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

app.post('/api/analyze', async (req, res) => {
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
2. Red flags - serious issues with financial impact >£5,000 (e.g., short lease, high service charges, structural concerns for the age, flooding risk for the area)
3. Warnings - moderate concerns with £1,000-£5,000 impact (e.g., above-average ground rent, potential maintenance costs)
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
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse the JSON from Claude's response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    res.json(analysis);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message || 'An unexpected error occurred',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Property Edge AI server running on port ${PORT}`);
});
