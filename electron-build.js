const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = __dirname;

console.log('[electron-build] Step 0/6: App icon (build/icon.ico)...');
// try {
//   execSync('python scripts/generate-app-icon.py', { stdio: 'inherit', cwd: root });
// } catch (e) {
//   console.warn('[electron-build] icon generate skipped:', e.message);
// }
const iconCache = path.join(root, 'dist', '.icon-ico');
if (fs.existsSync(iconCache)) {
  fs.rmSync(iconCache, { recursive: true, force: true });
}

console.log('[electron-build] Step 1/6: Next.js production build...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: root });
} catch (e) {
  console.error('[electron-build] Next.js build failed');
  process.exit(1);
}

const stagingDir = path.join(root, 'print-engine-staging');
const puppeteerMarker = path.join(stagingDir, 'node_modules', 'puppeteer-core', 'package.json');

console.log('[electron-build] Step 2/6: print-engine (puppeteer-core)...');
if (!fs.existsSync(puppeteerMarker)) {
  fs.mkdirSync(stagingDir, { recursive: true });
  execSync('npm install puppeteer-core@19.11.1 --omit=dev --no-package-lock --prefix print-engine-staging', {
    stdio: 'inherit',
    cwd: root,
  });
} else {
  console.log('  print-engine-staging already present, skip npm install');
}

console.log('[electron-build] Step 3/6: Ribbon bridge files...');
// require('./scripts/sync-ribbon-from-floxync.js').syncRibbonFromFloxync();

const gdiPath = path.join(root, 'electron', 'engine', 'dist', 'gdi_print_cli.exe');
const winIconPath = path.join(root, 'build', 'icon.ico');
if (!fs.existsSync(winIconPath)) {
  console.error('[electron-build] build/icon.ico 없음 — 윈도우 exe/바로가기 아이콘 적용 불가');
  console.error('  생성: python scripts/generate-app-icon.py (build/brand-source.png 필요)');
  process.exit(1);
}
try {
  execSync('python -c "from PIL import Image; i=Image.open(\'build/icon.ico\'); assert max(i.size)>=256, i.size"', {
    stdio: 'inherit',
    cwd: root,
  });
} catch (e) {
  console.error('[electron-build] build/icon.ico 256x256 미만 — generate-app-icon.py 재실행 필요');
  process.exit(1);
}
console.log('[electron-build] build/icon.ico OK (256+)');

if (!fs.existsSync(gdiPath)) {
  console.warn('[electron-build] WARNING: gdi_print_cli.exe 없음 → 패키지 리본 네이티브 인쇄 불가');
  console.warn('  빌드: docs/windows-app-print-engine.md 참고 → electron/engine/dist/');
} else {
  console.log('[electron-build] gdi_print_cli.exe OK');
}

const bridgeRequired = [
  path.join(root, 'bridge-app', 'ppbridge.exe'),
  path.join(root, 'bridge-app', 'SumatraPDF-3.4.6-32.exe'),
  path.join(root, 'vendor', 'ribbon-bridge', 'RibbonBridgePackage.zip'),
  path.join(root, 'vendor', 'ribbon-bridge', 'RibbonBridge_Setup_v25_0.exe'),
  path.join(root, 'public', 'RibbonBridge_Setup_v25_0.exe'),
  path.join(root, 'build', 'install-bridges.ps1'),
  path.join(root, 'build', 'run-bridge-pp.cmd'),
  path.join(root, 'build', 'install-pp-bridge.cmd'),
  path.join(root, 'build', 'install-ribbon-bridge.cmd'),
  path.join(root, 'build', 'run-bridge-ribbon.cmd'),
  path.join(root, 'build', 'installer.nsh'),
  path.join(root, 'build', 'icon.ico'),
  path.join(root, 'public', 'favicon.ico'),
];
const bridgeMissing = bridgeRequired.filter((p) => !fs.existsSync(p));
if (bridgeMissing.length) {
  console.error('[electron-build] 웹 브릿지/설치 파일 누락:');
  bridgeMissing.forEach((p) => console.error('  -', p));
  process.exit(1);
}

if (!fs.existsSync(path.join(root, '.env.local'))) {
  console.warn('[electron-build] WARNING: .env.local 없음 → 설치본 동기화(SyncWorker) 실패 가능');
} else {
  console.log('[electron-build] .env.local OK (extraResources에 포함)');
}

const standaloneSrc = path.join(root, '.next', 'standalone');
const staticSrc = path.join(root, '.next', 'static');

console.log('[electron-build] Step 4/6: Prepare standalone (static + public)...');
if (!fs.existsSync(staticSrc)) {
  console.error('[electron-build] .next/static 없음 — npm run build 실패 가능');
  process.exit(1);
}
try {
  fs.cpSync(staticSrc, path.join(standaloneSrc, '.next', 'static'), { recursive: true });
  fs.cpSync(path.join(root, 'public'), path.join(standaloneSrc, 'public'), { recursive: true });
} catch (e) {
  console.error('[electron-build] static copy failed:', e.message);
  process.exit(1);
}

const chunksDir = path.join(standaloneSrc, '.next', 'static', 'chunks');
const chunkCount = fs.existsSync(chunksDir) ? fs.readdirSync(chunksDir).length : 0;
if (chunkCount < 5) {
  console.error('[electron-build] static/chunks 비어 있음 — 앱이 404로 멈춥니다.');
  process.exit(1);
}
console.log(`[electron-build] static/chunks: ${chunkCount} files`);

const wrapDir = path.join(root, 'pack', 'wrap', 'next-standalone');
fs.rmSync(path.join(root, 'pack', 'wrap'), { recursive: true, force: true });
fs.mkdirSync(wrapDir, { recursive: true });
fs.cpSync(standaloneSrc, wrapDir, { recursive: true });
const nextMod = path.join(wrapDir, 'node_modules', 'next', 'package.json');
if (!fs.existsSync(nextMod)) {
  console.error('[electron-build] standalone node_modules/next 없음 — 설치본 서버 기동 불가');
  process.exit(1);
}
console.log('[electron-build] pack/wrap/next-standalone 준비 완료 (extraResources)');

console.log('[electron-build] Step 5/6: electron-builder...');
require('dotenv').config({ path: path.join(root, '.env.local') });
try {
  execSync('npx electron-builder --publish always', { 
    stdio: 'inherit', 
    cwd: root,
    env: { ...process.env }
  });
} catch (e) {
  console.error('[electron-build] electron-builder 빌드/배포 실패:', e.message);
  process.exit(1);
}

const unpackedNext = path.join(root, 'dist', 'win-unpacked', 'resources', 'next-standalone', 'node_modules', 'next', 'package.json');
if (!fs.existsSync(unpackedNext)) {
  console.error('[electron-build] 설치본 검증 실패: resources/next-standalone/node_modules/next 없음');
  console.error('  electron-builder가 node_modules를 누락했습니다. pack/wrap 구조를 확인하세요.');
  process.exit(1);
}
console.log('[electron-build] 설치본 검증 OK (next-standalone/node_modules/next)');

const appIcon = path.join(root, 'dist', 'win-unpacked', 'resources', 'app-icon.ico');
if (!fs.existsSync(appIcon)) {
  console.error('[electron-build] resources/app-icon.ico 없음 — 바로가기 아이콘 실패');
  process.exit(1);
}
console.log('[electron-build] Step 6/6: 설치본 아이콘 리소스 OK');
