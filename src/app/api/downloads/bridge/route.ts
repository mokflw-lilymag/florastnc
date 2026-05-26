import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  try {
    const zip = new AdmZip();
    
    // Explicitly add only small HTML templates so Next.js doesn't trace the entire bridge-app folder
    const templates = [
      'receipt-template.html',
      'receipt-pickup.html',
      'receipt-delivery-shop.html',
      'receipt-delivery-driver.html'
    ];
    for (const tpl of templates) {
      // NOTE: Using a static string for path.join is necessary to limit Vercel tracing.
      // But because it's a variable here, we will just read them from 'bridge-app' directory
      // Wait, to be perfectly safe, we should use explicit path.join for each file.
    }
    
    // Hardcode the template paths so Next.js tracing only includes these files, NOT the whole folder!
    const tpl1 = path.join(process.cwd(), 'bridge-app', 'receipt-template.html');
    if (fs.existsSync(tpl1)) zip.addLocalFile(tpl1);
    
    const tpl2 = path.join(process.cwd(), 'bridge-app', 'receipt-pickup.html');
    if (fs.existsSync(tpl2)) zip.addLocalFile(tpl2);
    
    const tpl3 = path.join(process.cwd(), 'bridge-app', 'receipt-delivery-shop.html');
    if (fs.existsSync(tpl3)) zip.addLocalFile(tpl3);
    
    const tpl4 = path.join(process.cwd(), 'bridge-app', 'receipt-delivery-driver.html');
    if (fs.existsSync(tpl4)) zip.addLocalFile(tpl4);

    // Create the custom .env content populated with the tenantId
    const envContent = `SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}
TENANT_ID=${tenantId}
`;
    zip.addFile('.env', Buffer.from(envContent, 'utf8'));

    // Create a dynamic install.bat that downloads the heavy .exe files directly from the public folder
    const installBatContent = `@echo off
chcp 65001 >nul 2>&1
echo ==============================================
echo LilyMag Bridge POS Printer Setup (v10.9)
echo ==============================================
echo.
echo 1. 기존에 실행중인 백그라운드 브릿지 서비스를 완전히 종료합니다...
taskkill /F /IM ppbridge.exe /T >nul 2>&1
taskkill /F /IM ppbridge-daemon.exe /T >nul 2>&1
taskkill /F /IM LilyMag-Print-Bridge.exe /T >nul 2>&1
echo.
echo 2. 필수 브릿지 실행 파일들을 다운로드합니다...
curl -L -o ppbridge.exe "${baseUrl}/downloads/ppbridge.exe"
curl -L -o SumatraPDF-3.4.6-32.exe "${baseUrl}/downloads/SumatraPDF-3.4.6-32.exe"
echo.
echo 3. 브릿지 프로그램을 자동 설치합니다...
echo (검은색 터미널 창을 숨기고 자동 실행되도록 구성합니다.)
echo 잠시만 기다려주세요...
echo.

set CURRENT_TENANT_ID=${tenantId}
ppbridge.exe

echo.
echo 팝업창으로 '설치(업데이트)가 완료되었습니다' 메시지가 뜨면 성공입니다!
echo 이제 이 창을 닫으셔도 됩니다.
pause
`;
    zip.addFile('install.bat', Buffer.from(installBatContent, 'utf-8'));

    // Get the zip buffer
    const zipBuffer = zip.toBuffer();

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="ppbridge-setup.zip"',
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 });
  }
}
