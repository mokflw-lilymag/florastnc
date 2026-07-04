import { GoogleGenerativeAI } from "@google/generative-ai";
import { toBaseLocale } from "@/i18n/config";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
);

const LOCALE_NAMES: Record<string, string> = {
  ko: "Korean",
  en: "English",
  vi: "Vietnamese",
  ja: "Japanese",
  zh: "Chinese",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ru: "Russian",
  id: "Indonesian",
  th: "Thai",
  ar: "Arabic",
};

export async function translateSupportReply(
  original: string,
  originalLocale: string,
  targetLocale: string,
): Promise<string | null> {
  const target = toBaseLocale(targetLocale as "ko");
  const source = toBaseLocale(originalLocale as "ko");
  if (target === source) return null;
  if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
    return null;
  }

  const targetName = LOCALE_NAMES[target] ?? target;
  const sourceName = LOCALE_NAMES[source] ?? source;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(
      `Translate the following customer support reply from ${sourceName} to ${targetName}. ` +
        `Keep product names (Floxync, ppBridge) unchanged. Output ONLY the translation.\n\n${original}`,
    );
    const text = result.response.text()?.trim();
    return text || null;
  } catch (e) {
    console.warn("[support-tickets] translate failed", e);
    return null;
  }
}
