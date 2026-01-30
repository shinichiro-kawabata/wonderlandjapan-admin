
import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  // 檢查是否有數據
  if (!records || records.length === 0) {
    return lang === 'ja' ? '分析するデータがありません。先に記録を入力してください。' : 'No data to analyze. Please add some records first.';
  }
  
  // 安全地獲取 API Key
  let apiKey = '';
  try {
    apiKey = (process.env.API_KEY as string) || '';
  } catch (e) {
    console.error("Environment Variable Error");
  }

  if (!apiKey) {
    return lang === 'ja' 
      ? 'APIキーが検出できません。Vercel的環境変数を再確認し、再デプロイしてください。' 
      : 'API Key not detected. Check Vercel Env Vars and redeploy.';
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // 數據摘要，特別強調 tour 類型
    const dataSummary = records.map(r => ({
      d: r.date,
      type: r.type,
      rev: r.revenue,
      pax: r.guests,
      guide: r.guide
    })).slice(0, 60);

    const prompt = `
      You are a professional business consultant for WonderlandJapan.
      Analyze the following tour record data (CSV-like JSON) and provide a strategic report in ${lang === 'ja' ? 'Japanese' : 'English'}:
      
      ${JSON.stringify(dataSummary)}

      Context: We provide Gion Walking, Arashiyama Walking, Kyoto Food, and Osaka Food tours.
      
      Please provide:
      1. Performance Review: Which tour type or guide is generating the most value?
      2. Efficiency Analysis: Average revenue per guest (PAX) and group size trends.
      3. Actionable Strategy: How to optimize the schedule or pricing based on the current data?

      Use Markdown, keep it professional, sharp, and concise.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are the AI Strategy Officer for WonderlandJapan. Your goal is to maximize tour profitability and guide efficiency.",
        temperature: 0.7,
      }
    });

    return response.text || (lang === 'ja' ? '診断結果の生成に失敗しました。' : 'Failed to generate insight.');
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    const msg = error.message || '';
    if (msg.includes('API_KEY_INVALID')) return lang === 'ja' ? 'APIキーが無効です。' : 'Invalid API Key.';
    if (msg.includes('quota')) return lang === 'ja' ? 'APIの利用制限に達しました。' : 'API quota exceeded.';
    return lang === 'ja' ? `エラー: ${msg}` : `Error: ${msg}`;
  }
}
