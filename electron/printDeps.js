const path = require('path');
const fs = require('fs');

function isPackagedApp() {
  try {
    const { app } = require('electron');
    return !!(app && app.isPackaged);
  } catch {
    return false;
  }
}

/** 개발: bridge-app/node_modules · 설치본: resources/print-engine */
function moduleSearchPaths(pkgName) {
  const paths = [];
  if (isPackagedApp() && process.resourcesPath) {
    paths.push(path.join(process.resourcesPath, 'print-engine', 'node_modules', pkgName));
    paths.push(path.join(process.resourcesPath, 'print-engine', pkgName));
  }
  paths.push(path.join(__dirname, '..', 'bridge-app', 'node_modules', pkgName));
  return paths;
}

function resolveModulePath(pkgName) {
  for (const p of moduleSearchPaths(pkgName)) {
    if (fs.existsSync(path.join(p, 'package.json'))) return p;
  }
  return null;
}

function requirePrintModule(pkgName) {
  const resolved = resolveModulePath(pkgName);
  if (resolved) return require(resolved);
  const tried = moduleSearchPaths(pkgName).join('\n  - ');
  throw new Error(
    `Cannot find module '${pkgName}'. Checked:\n  - ${tried}\n` +
      '개발 PC: bridge-app 폴더에서 npm install. 설치본: npm run electron:build 로 다시 빌드하세요.'
  );
}

module.exports = {
  requirePrintModule,
  resolveModulePath,
  bridgeAppRoot() {
    if (isPackagedApp() && process.resourcesPath) {
      const engine = path.join(process.resourcesPath, 'print-engine');
      if (fs.existsSync(engine)) return engine;
    }
    return path.join(__dirname, '..', 'bridge-app');
  },
};
