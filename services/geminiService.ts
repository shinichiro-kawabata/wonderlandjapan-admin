import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const analyzeRecords = async (records: TourRecord[], lang: Language): Promise<string> => {
  if (records.length === 0) return lang === 'ja' ? 'データがありません。' : 'No data available.';

  const stats = records.reduce((acc, r) => {
    acc.totalRevenue += r.revenue;
    acc.totalGuests += r.guests;
    acc.tourTypes[r.type] = (acc.tourTypes[r.type] || 0) + 1;
    acc.guides[r.guide] = (acc.guides[r.guide] || 0) + r.revenue;
    return acc;
  }, { totalRevenue: 0, totalGuests: 0, tourTypes: {} as Record<string, number>, guides: {} as Record<string, number> });

  const prompt = `
    As a professional business consultant for WonderlandJapan, analyze the following tour performance data and provide a highly constructive, strategic report.
    
    Data Summary:
    - Total Revenue: ¥${stats.totalRevenue.toLocaleString()}
    - Total Guests: ${stats.totalGuests}
    - Tour Distribution: ${JSON.stringify(stats.tourTypes)}
    - Guide Performance (Revenue): ${JSON.stringify(stats.guides)}
    
    Please provide:
    1. A concise executive summary of current performance.
    2. Identification of the most profitable tour types and guides.
    3. Three specific, actionable recommendations to increase revenue or efficiency (e.g., marketing focus, resource allocation, pricing strategy).
    4. A forward-looking projection based on current trends.
    
    Language: ${lang === 'ja' ? 'Japanese' : 'English'}
    Tone: Professional, sophisticated, and insightful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Analysis failed.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return lang === 'ja' ? '分析中にエラーが発生しました。' : 'An error occurred during analysis.';
  }
};
