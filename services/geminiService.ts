import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  if (records.length === 0) return null;
  
  const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
  
  if (!apiKey) {
    return "API KEY Error.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const dataSummary = records.map(r => ({
    date: r.date,
    type: r.type,
    revenue: r.revenue,
    guests: r.guests,
    duration: r.duration,
    guide: r.guide
  }));

  const targetLang = lang === 'ja' ? 'Japanese (日本語)' : 'English';

  const prompt = `
    You are a professional business consultant for WonderlandJapan, a tour company in Japan.
    Here is the recent tour data:
    ${JSON.stringify(dataSummary)}

    Please provide a concise business analysis report in ${targetLang}:
    1. Revenue Performance: Highlight the best performing tours or guides.
    2. Operational Efficiency: Average revenue per hour.
    3. Actionable Advice: Suggest next steps for management (e.g., pricing, marketing specific routes).

    Keep it professional, use bullet points, and ensure it is easy to read on mobile.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return null;
  }
}