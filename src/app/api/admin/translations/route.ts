import fs from "fs/promises";
import path from "path";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { NextResponse } from "next/server";

const LOCALES = [
  { code: "ko", file: "ko.json" },
  { code: "en", file: "en.json" },
  { code: "vi", file: "vi.json" },
  { code: "ja", file: "ja.json" },
  { code: "zh", file: "zh.json" },
  { code: "zh-TW", file: "zh-TW.json" },
  { code: "es", file: "es.json" },
  { code: "pt", file: "pt.json" },
  { code: "fr", file: "fr.json" },
  { code: "de", file: "de.json" },
  { code: "ru", file: "ru.json" },
  { code: "id", file: "id.json" },
  { code: "ms", file: "ms.json" },
  { code: "th", file: "th.json" },
  { code: "nl", file: "nl.json" },
  { code: "it", file: "it.json" },
  { code: "hi", file: "hi.json" },
  { code: "ar", file: "ar.json" },
];

const MESSAGES_DIR = path.join(process.cwd(), "src", "i18n", "messages");

function flattenObject(obj: any, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(result, flattenObject(obj[key], newKey));
      } else {
        result[newKey] = String(obj[key]);
      }
    }
  }
  return result;
}

function unflattenObject(flatObj: Record<string, any>): any {
  const result: any = {};
  for (const key in flatObj) {
    if (Object.prototype.hasOwnProperty.call(flatObj, key)) {
      const parts = key.split(".");
      let current = result;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = flatObj[key];
        } else {
          if (!current[part] || typeof current[part] !== "object") {
            current[part] = {};
          }
          current = current[part];
        }
      }
    }
  }
  return result;
}

export async function GET(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  const sp = new URL(req.url).searchParams;
  const action = sp.get("action");

  if (action !== "list") {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  try {
    // 모든 언어 파일을 읽어옵니다.
    const fileContents = await Promise.all(
      LOCALES.map(async (l) => {
        const filePath = path.join(MESSAGES_DIR, l.file);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const parsed = JSON.parse(content);
          return { code: l.code, data: flattenObject(parsed) };
        } catch {
          return { code: l.code, data: {} as Record<string, string> };
        }
      })
    );

    // 번역 맵 구성
    const localeDataMap = new Map(fileContents.map((fc) => [fc.code, fc.data]));
    const enData = localeDataMap.get("en") || {};
    const allKeys = Array.from(new Set(fileContents.flatMap((fc) => Object.keys(fc.data)))).sort();

    const entries = allKeys.map((key) => {
      const translations: Record<string, string> = {};
      LOCALES.forEach((l) => {
        translations[l.code] = localeDataMap.get(l.code)?.[key] ?? "";
      });

      // 기계번역 의심 (isSuspect) 검출
      const enVal = (translations["en"] ?? "").trim();
      let isSuspect = false;
      if (enVal) {
        const lowerEn = enVal.toLowerCase();
        for (const code of Object.keys(translations)) {
          if (code === "en" || code === "ko") continue;
          const otherVal = (translations[code] ?? "").trim();
          if (otherVal && otherVal.toLowerCase() === lowerEn) {
            isSuspect = true;
            break;
          }
        }
      }

      return {
        key,
        translations,
        isSuspect,
      };
    });

    // 커버리지(%) 연산
    const enKeys = Object.keys(enData);
    const totalEnKeys = enKeys.length;
    const coverage: Record<string, number> = {};

    LOCALES.forEach((l) => {
      if (l.code === "en") {
        coverage["en"] = 100;
        return;
      }

      if (totalEnKeys === 0) {
        coverage[l.code] = 0;
        return;
      }

      const lData = localeDataMap.get(l.code) || {};
      let translatedCount = 0;

      enKeys.forEach((key) => {
        const enVal = (enData[key] ?? "").trim();
        const lVal = (lData[key] ?? "").trim();
        if (lVal && lVal !== enVal) {
          translatedCount++;
        }
      });

      coverage[l.code] = Math.round((translatedCount / totalEnKeys) * 100);
    });

    return NextResponse.json({ entries, coverage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { key, changes } = await req.json();
    if (!key || !changes || typeof changes !== "object") {
      return NextResponse.json({ error: "KEY_AND_CHANGES_REQUIRED" }, { status: 400 });
    }

    // 각 언어 파일을 하나씩 수정합니다.
    await Promise.all(
      LOCALES.map(async (l) => {
        const newValue = changes[l.code];
        if (newValue === undefined) return; // 변경사항 없음

        const filePath = path.join(MESSAGES_DIR, l.file);
        let parsed: any = {};
        try {
          const content = await fs.readFile(filePath, "utf-8");
          parsed = JSON.parse(content);
        } catch {
          parsed = {};
        }

        const flat = flattenObject(parsed);
        flat[key] = newValue;

        const unflat = unflattenObject(flat);
        const jsonStr = JSON.stringify(unflat, null, 2);
        await fs.writeFile(filePath, jsonStr, "utf-8");
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
