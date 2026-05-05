import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      walk(p, acc);
    } else if (/\.(tsx|ts)$/.test(e.name) && !p.includes("pick-ui-text")) acc.push(p);
  }
  return acc;
}

function extractCallArgs(source, openParenIndex) {
  let i = openParenIndex + 1;
  let depth = 1;
  const start = i;
  while (i < source.length && depth > 0) {
    const c = source[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === q) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    i++;
  }
  return source.slice(start, i - 1);
}

function countTopLevelCommas(chunk) {
  let depth = 0;
  let q = null;
  let count = 0;
  for (let j = 0; j < chunk.length; j++) {
    const c = chunk[j];
    if (q) {
      if (c === "\\") {
        j++;
        continue;
      }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      q = c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) count++;
  }
  return count;
}

const root = path.join(process.cwd(), "src");
let found = false;
for (const f of walk(root)) {
  const s = fs.readFileSync(f, "utf8");
  const re = /pickUiText\s*\(/g;
  let m;
  while ((m = re.exec(s))) {
    const inner = extractCallArgs(s, m.index + "pickUiText".length);
    const commas = countTopLevelCommas(inner);
    const argCount = commas + 1;
    if (argCount < 11) {
      found = true;
      const line = s.slice(0, m.index).split("\n").length;
      console.log(`${f}:${line} pickUiText argCount=${argCount}`);
    }
  }
}
if (!found) console.log("OK: all pickUiText calls have >= 11 args.");
