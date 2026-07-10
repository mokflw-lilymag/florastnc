const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');
const { app } = require('electron');
const { generateEscPosBuffer } = require('./escposGenerator');

// 디버깅/로깅 함수
function defaultLog(msg) {
  console.log('[RAW_PRINT]', msg);
}

/**
 * RAW (ESC/POS) 방식으로 영수증을 프린터 스풀러에 직접 전송
 * @param {Object} job 정규화된 인쇄 Job 객체
 * @param {Object} settings 지점 환경설정
 * @param {string} targetPrinter 최종 대상 프린터명
 * @param {Function} logFn 로그 함수
 */
async function printRawReceipt(job, settings, targetPrinter, logFn = defaultLog) {
  let binPath = '';
  try {
    logFn(`RAW 변환 시작: job_type=${job?.job_type}, printer=${targetPrinter}`);
    
    // 환경설정에서 로고 이미지 URL 가져오기 (없을 경우 fallback)
    const logoUrl = settings?.logoUrl || settings?.branchLogoUrl || 'https://raw.githubusercontent.com/floxync/brand/main/logo/floxync_logo_mono.png';

    // 1. ESC/POS 버퍼 생성
    const rawBuffer = await generateEscPosBuffer(job, settings, logoUrl);
    if (!rawBuffer || rawBuffer.length === 0) {
      throw new Error('ESC/POS 버퍼 생성 실패');
    }

    // 2. 임시 bin 파일 저장
    const tmpDir = os.tmpdir();
    binPath = path.join(tmpDir, `floxync_raw_${Date.now()}_${Math.floor(Math.random()*1000)}.bin`);
    fs.writeFileSync(binPath, rawBuffer);
    logFn(`RAW 파일 생성 완료: ${binPath} (${rawBuffer.length} bytes)`);

    // 3. raw_print_cli.exe 경로 찾기
    let cliPath;
    if (app.isPackaged) {
      cliPath = path.join(process.resourcesPath, 'engine', 'raw_print_cli.exe');
    } else {
      cliPath = path.join(__dirname, 'engine', 'raw_print_cli.exe');
    }

    if (!fs.existsSync(cliPath)) {
      throw new Error(`C# RAW 프린트 엔진(raw_print_cli.exe)을 찾을 수 없습니다. 경로: ${cliPath}`);
    }

    // 4. 스풀러 전송 실행
    // raw_print_cli.exe <PrinterName> <FilePath>
    const args = `"${cliPath}" "${targetPrinter}" "${binPath}"`;
    logFn(`RAW CLI 실행: ${args}`);
    
    const output = execSync(args, { encoding: 'utf-8', windowsHide: true });
    
    if (output && output.includes('SUCCESS')) {
      logFn(`RAW 인쇄 전송 성공`);
      return true;
    } else {
      throw new Error(`RAW 엔진 오류: ${output}`);
    }

  } catch (e) {
    logFn(`[ERROR] RAW 인쇄 실패: ${e.message}`);
    throw e;
  } finally {
    // 5. 임시 파일 삭제 (전송이 끝났으므로 즉시 삭제해도 됨)
    if (binPath && fs.existsSync(binPath)) {
      try {
        fs.unlinkSync(binPath);
      } catch (err) {}
    }
  }
}

module.exports = {
  printRawReceipt
};
