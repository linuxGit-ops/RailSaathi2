import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

interface ParsedGoalOutput {
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  dateRange: string[];
  classCode: string;
  passengers: number;
  fulfillmentMode: 'ALL_OR_NOTHING' | 'PARTIAL_WITH_CONSENT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  warnings: string[];
}

const SYSTEM_PROMPT = `You are a specialized railway travel goal parser for Indian Railways (IRCTC / RailSaathi).
Extract travel parameters from the user's plain natural language input.
Return ONLY valid JSON matching this exact structure:
{
  "fromCode": "HWH", // 3-4 letter station code, e.g. HWH (Howrah/Kolkata), NDLS (New Delhi/Delhi), CNB (Kanpur), PRYJ (Prayagraj/Allahabad), MGS (Varanasi/Mughal Sarai), MAS (Chennai), BCT (Mumbai)
  "fromName": "Howrah Jn",
  "toCode": "NDLS",
  "toName": "New Delhi",
  "dateRange": ["2026-09-27", "2026-09-28"], // YYYY-MM-DD format array
  "classCode": "2A", // "1A", "2A", "3A", "SL", "CC", "EC"
  "passengers": 2, // Integer 1-6
  "fulfillmentMode": "ALL_OR_NOTHING", // or "PARTIAL_WITH_CONSENT"
  "confidence": "HIGH", // "HIGH", "MEDIUM", "LOW"
  "warnings": [] // array of strings if assumptions had to be made
}
Output strictly JSON without markdown backticks or commentary.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { input, bookingAttemptId } = req.body || {};
  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid input prompt' });
  }

  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  const openaiKey = process.env.OPENAI_API_KEY;

  try {
    let rawText = '';

    // 1. Try OpenAI if API key provided
    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: input }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });
      rawText = response.choices[0]?.message?.content || '{}';
    } 
    // 2. Try Hugging Face Inference if token provided
    else if (hfToken) {
      const hf = new HfInference(hfToken);
      const prompt = `<s>[INST] ${SYSTEM_PROMPT}\n\nParse this user input:\n"${input}" [/INST]`;
      const result = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.3',
        inputs: prompt,
        parameters: {
          max_new_tokens: 300,
          temperature: 0.1,
          return_full_text: false,
        }
      });
      rawText = result.generated_text;
    } else {
      // Return notice to let frontend fallback smoothly
      return res.status(200).json({
        fallback: true,
        message: 'No LLM API keys configured (HUGGINGFACE_API_TOKEN or OPENAI_API_KEY)'
      });
    }

    // Extract JSON from output
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse structured JSON from LLM output');
    }

    const parsed: ParsedGoalOutput = JSON.parse(jsonMatch[0]);
    return res.status(200).json({
      success: true,
      data: parsed,
      bookingAttemptId,
      modelUsed: openaiKey ? 'openai/gpt-4o-mini' : 'huggingface/Mistral-7B-Instruct-v0.3'
    });
  } catch (error: any) {
    console.error('AI parse error:', error);
    return res.status(200).json({
      fallback: true,
      error: error.message || 'LLM parsing failed, falling back to local engine'
    });
  }
}
