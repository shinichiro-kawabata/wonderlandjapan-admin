
import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  if (!records || records.length === 0) {
    return lang === 'ja' ? '分析データがありません。' : 'No data to analyze.';
  }
  
  // 使用靜態環境變數初始化
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const dataSummary = records.map(r => ({
      d: r.date,
      type: r.type,
      rev: r.revenue,
      pax: r.guests,
      guide: r.guide
    })).slice(0, 40);

    const prompt = `
      You are the Elite Business Consultant for WonderlandJapan. 
      Analyze this tour performance data (Kyoto Gion/Arashiyama and Osaka Food Tours): ${JSON.stringify(dataSummary)}
      
      Provide a high-impact strategic report in ${lang === 'ja' ? 'Japanese' : 'English'} covering:
      1. Revenue & Efficiency Score.
      2. Guide Performance & Resource Allocation.
      3. Practical Marketing & Upselling Strategies.
      
      Keep it professional, sharp, and data-driven. Use bullet points.
    `;

    // 採用更穩定的 contents 陣列格式
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    return response.text || (lang === 'ja' ? '分析エラーが発生しました。' : 'Analysis failed.');
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return lang === 'ja' ? `エラー: ${error.message}` : `AI Consultant Error: ${error.message}`;
  }
}
