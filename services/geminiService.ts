
import { GoogleGenAI } from "@google/genai";
import { TourRecord, Language } from "../types";

export async function analyzeRecords(records: TourRecord[], lang: Language) {
  if (!records || records.length === 0) return null;
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY 尚未配置於環境變數中。");
    return lang === 'ja' ? 'APIキーが設定されていません。' : 'API Key is missing.';
  }

  // 每次調用創建新實例以確保使用最新配置
  const ai = new GoogleGenAI({ apiKey });

  // 簡化數據以節省 Token 並提高準確度
  const dataSummary = records.map(r => ({
    d: r.date,
    t: r.type,
    r: r.revenue,
    g: r.guests,
    gu: r.guide
  })).slice(0, 30); // 僅分析最近 30 筆數據

  const systemInstruction = lang === 'ja' 
    ? "あなたは日本観光業の専門コンサルタントです。WonderlandJapanの売上データを分析し、経営改善のための具体的で鋭い洞察を提供してください。"
    : "You are a professional business consultant specializing in Japanese tourism. Analyze the sales data and provide sharp, actionable insights.";

  const prompt = `
    以下是最近的導覽數據 (JSON):
    ${JSON.stringify(dataSummary)}

    請根據以上數據進行分析，並用 ${lang === 'ja' ? '日文' : '英文'} 回覆：
    1. 營收表現 (績效最好的路線或導遊)
    2. 客源分析 (平均每團人數與收益)
    3. 具體建議 (如何提高單價或優化排班)

    要求：
    - 使用 Markdown 格式。
    - 語氣專業且簡潔。
    - 針對數據中的弱點提出警告。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || (lang === 'ja' ? '診断結果を生成できませんでした。' : 'Could not generate diagnosis.');
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      return lang === 'ja' ? 'APIキーが無効です。' : 'Invalid API Key.';
    }
    return lang === 'ja' ? '診断中にエラーが発生しました。' : 'Error during diagnosis.';
  }
}
