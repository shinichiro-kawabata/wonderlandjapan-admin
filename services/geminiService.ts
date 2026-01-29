import { GoogleGenAI } from "@google/genai";
import { TourRecord } from "../types";

export async function analyzeRecords(records: TourRecord[]) {
  if (records.length === 0) return "尚無數據可供分析。請先新增一些導覽紀錄。";
  
  const apiKey = (window as any).process?.env?.API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : '');
  
  if (!apiKey) {
    return "系統偵測不到有效金鑰。請確認環境變數 API_KEY 已正確設定。";
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

  const prompt = `
    你是一位專業的日本旅遊公司經營顧問。以下是最近 WonderlandJapan 的導覽紀錄數據：
    ${JSON.stringify(dataSummary)}

    請針對這些數據提供一份簡短但專業的分析（請用繁體中文回覆）：
    1. 營收表現：哪種導覽或哪位導覽員的表現最亮眼？
    2. 營運效率：平均每小時產生的營收是多少？
    3. 行動建議：根據目前數據，建議管理者下一步該做什麼（例如調整價格、推廣特定路線等）？

    請保持回覆簡潔，多用條列式，確保在手機上容易閱讀。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    return "AI 分析暫時遇到問題，請稍後再試。";
  }
}