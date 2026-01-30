
import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  if (!records || records.length === 0) {
    return lang === 'ja' ? '分析するデータがありません。先に記録を入力してください。' : 'No data to analyze. Please add some records first.';
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

  try {
    const dataSummary = records.map(r => ({
      d: r.date,
      type: r.type,
      rev: r.revenue,
      pax: r.guests,
      guide: r.guide
    })).slice(0, 50);

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze this WonderlandJapan tour data and provide a strategic business report in ${lang === 'ja' ? 'Japanese' : 'English'}: ${JSON.stringify(dataSummary)}`,
      config: {
        systemInstruction: "You are the Chief Strategy Officer for WonderlandJapan. Provide sharp, professional business insights including: 1. Performance Overview 2. Efficiency Trends 3. Practical Growth Strategies.",
        temperature: 0.8,
      }
    });

    return response.text || (lang === 'ja' ? '診断結果の生成に失敗しました。' : 'Failed to generate insight.');
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return lang === 'ja' ? `分析エラー: ${error.message}` : `AI Error: ${error.message}`;
  }
}
