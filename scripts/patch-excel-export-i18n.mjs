import fs from "fs";

const pathTs = new URL("../src/lib/excel-export.ts", import.meta.url);
const s0 = fs.readFileSync(pathTs, "utf8");
const lines = s0.split(/\r?\n/);

const oldReturn = lines[289];
const oldThrow = lines[292];
const oldWarn = lines[295];
const oldMsgBlock = lines.slice(310, 313).join(s0.includes("\r\n") ? "\r\n" : "\n");
const oldCatch = lines[317];

const koSuccessInner = oldReturn.match(/message: `(.+)`/)?.[1];
if (!koSuccessInner) {
  console.error("Could not parse success message from", oldReturn);
  process.exit(1);
}
const koSuccessInnerN = koSuccessInner.replace("${data.rows.length}", "${n}");

const newReturn = `        const n = data.rows.length;
        return {
          success: true,
          message: pickUiText(
            bl,
            \`${koSuccessInnerN}\`,
            \`✅ Exported \${n} rows to Google Sheet tab "\${sheetName}".\`,
            \`✅ Đã xuất \${n} dòng sang tab Google Sheet "\${sheetName}".\`,
            \`✅ Googleシート「\${sheetName}」に\${n}件を書き出しました。\`,
            \`✅ 已将 \${n} 行导出到 Google 表格工作表「\${sheetName}」。\`,
            \`✅ Se exportaron \${n} filas a la pestaña "\${sheetName}".\`,
            \`✅ \${n} linhas exportadas para a aba "\${sheetName}".\`,
            \`✅ \${n} lignes exportées vers l'onglet « \${sheetName} ».\`,
            \`✅ \${n} Zeilen in den Tab „\${sheetName}“ exportiert.\`,
            \`✅ Экспортировано строк: \${n} на вкладку «\${sheetName}».\`,
          ),
        };`;

const newThrow = `        throw new Error(
          errData.error ||
            pickUiText(
              bl,
              "시트보내기 실패",
              "Sheet export failed.",
              "Xuất sheet thất bại.",
              "シートの書き出しに失敗しました。",
              "表格导出失败。",
              "Error al exportar la hoja.",
              "Falha ao exportar a planilha.",
              "Échec de l'export de la feuille.",
              "Tabellenexport fehlgeschlagen.",
              "Не удалось экспортировать лист.",
            ),
        );`;

const newWarn =
  '      console.warn("[excel-export] Google Sheets API failed, falling back to Excel download:", err);';

const newMsgBlock = `    const n = data.rows.length;
    const msg = spreadsheetId
      ? pickUiText(
          bl,
          \`⚠️ 구글 시트 연동 실패. 엑셀 파일로 다운로드했습니다. (\${n}건)\`,
          \`⚠️ Google Sheets export failed. Downloaded Excel instead (\${n} rows).\`,
          \`⚠️ Xuất Google Sheet thất bại. Đã tải Excel (\${n} dòng).\`,
          \`⚠️ Googleシート連携に失敗しました。Excelでダウンロードしました（\${n}件）。\`,
          \`⚠️ Google 表格导出失败，已改为 Excel 下载（\${n} 行）。\`,
          \`⚠️ Falló la exportación a Google Sheets. Se descargó Excel (\${n} filas).\`,
          \`⚠️ Falha ao exportar para Google Sheets. Baixado Excel (\${n} linhas).\`,
          \`⚠️ Échec Google Sheets. Téléchargement Excel (\${n} lignes).\`,
          \`⚠️ Google Sheets fehlgeschlagen. Excel heruntergeladen (\${n} Zeilen).\`,
          \`⚠️ Ошибка Google Sheets. Скачан Excel (\${n} строк).\`,
        )
      : pickUiText(
          bl,
          \`📄 엑셀 파일로 다운로드 완료 (\${n}건)\`,
          \`📄 Downloaded as Excel (\${n} rows).\`,
          \`📄 Đã tải Excel (\${n} dòng).\`,
          \`📄 Excelでダウンロード完了（\${n}件）。\`,
          \`📄 已下载 Excel（\${n} 行）。\`,
          \`📄 Descargado como Excel (\${n} filas).\`,
          \`📄 Baixado como Excel (\${n} linhas).\`,
          \`📄 Téléchargé en Excel (\${n} lignes).\`,
          \`📄 Als Excel heruntergeladen (\${n} Zeilen).\`,
          \`📄 Скачан Excel (\${n} строк).\`,
        );`;

const newCatch = `    return {
      success: false,
      message: pickUiText(
        bl,
        "보내기에 실패했습니다.",
        "Export failed.",
        "Xuất dữ liệu thất bại.",
        "書き出しに失敗しました。",
        "导出失败。",
        "Error al exportar.",
        "Falha na exportação.",
        "Échec de l'export.",
        "Export fehlgeschlagen.",
        "Не удалось выполнить экспорт.",
      ),
    };`;

let s = s0;
for (const [name, o, r] of [
  ["oldReturn", oldReturn, newReturn],
  ["oldThrow", oldThrow, newThrow],
  ["oldWarn", oldWarn, newWarn],
  ["oldMsgBlock", oldMsgBlock, newMsgBlock],
  ["oldCatch", oldCatch, newCatch],
]) {
  if (!s.includes(o)) {
    console.error("Missing:", name, JSON.stringify(o.slice(0, 140)));
    process.exit(1);
  }
  s = s.replace(o, r);
}

fs.writeFileSync(pathTs, s);
console.log("excel-export.ts patched OK");
