import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') || '';

  try {
    const zip = new AdmZip();
    
    // Add the EXE file to the zip
    const exePath = path.join(process.cwd(), 'public', 'downloads', 'ppbridge.exe');
    if (fs.existsSync(exePath)) {
      zip.addLocalFile(exePath);
    } else {
      console.warn('ppbridge.exe not found at:', exePath);
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

    const tpl5 = path.join(process.cwd(), 'bridge-app', 'receipt-daily-settlement.html');
    if (fs.existsSync(tpl5)) zip.addLocalFile(tpl5);

    const tpl6 = path.join(process.cwd(), 'bridge-app', 'receipt-market-list.html');
    if (fs.existsSync(tpl6)) zip.addLocalFile(tpl6);

    const labelsPath = path.join(process.cwd(), 'bridge-app', 'receipt-labels.json');
    if (fs.existsSync(labelsPath)) zip.addLocalFile(labelsPath);

    const i18nPath = path.join(process.cwd(), 'bridge-app', 'receipt-i18n.js');
    if (fs.existsSync(i18nPath)) zip.addLocalFile(i18nPath);

    const batPath = path.join(process.cwd(), 'bridge-app', 'install.bat');
    if (fs.existsSync(batPath)) zip.addLocalFile(batPath);

    const sumatraPath = path.join(process.cwd(), 'bridge-app', 'SumatraPDF-3.4.6-32.exe');
    if (fs.existsSync(sumatraPath)) zip.addLocalFile(sumatraPath);

    // Create the custom .env content populated with generic settings
    const envContent = `SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}
CURRENT_BRANCH_ID=${tenantId}
TENANT_ID=${tenantId}
`;
    zip.addFile('.env', Buffer.from(envContent, 'utf8'));

    // Get the zip buffer
    const zipBuffer = zip.toBuffer();

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="Floxync-Bridge-Setup.zip"',
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 });
  }
}
