
import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  if (!records || records.length === 0) return null;
  
  // 安全地獲取 API Key
  let apiKey = '';
  try {
    apiKey = process.env.API_KEY || '';
  } catch (e) {
    console.error("無法讀取環境變數 process.env");
  }

  if (!apiKey) {
    return lang === 'ja' 
      ? 'APIキーが設定されていません。Vercelの環境変数を確認してください。' 
      : 'API Key missing. Please check Vercel Environment Variables.';
  }

  // 初始化 Gemini
  const ai = new GoogleGenAI({ apiKey });

  // 整理數據：縮減體積以提高成功率
  const dataSummary = records.map(r => ({
    date: r.date,
    tour: r.type,
    rev: r.revenue,
    pax: r.guests,
    guide: r.guide
  })).slice(0, 50);

  const prompt = `
    Analyze this Japanese tourism business data and provide a strategic report in ${lang === 'ja' ? 'Japanese' : 'English'}:
    ${JSON.stringify(dataSummary)}

    Please focus on:
    1. Revenue performance (Best routes/guides)
    2. Customer analysis (Avg revenue per guest)
    3. Actionable advice to increase profit.

    Use Markdown formatting, be professional and concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a senior business analyst for WonderlandJapan, a tour operator in Kyoto and Osaka.",
        temperature: 0.7,
      }
    });

    // 確保讀取 .text 屬性而不是調用方法
    const resultText = response.text;
    return resultText || (lang === 'ja' ? '診断結果が空でした。' : 'Result was empty.');
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return lang === 'ja' 
      ? `分析中にエラーが発生しました: ${error.message || 'Unknown Error'}` 
      : `Analysis error: ${error.message || 'Unknown Error'}`;
  }
}
