import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
  }

  try {
    const exePath = path.join(process.cwd(), 'public', 'downloads', 'ppbridge.exe');
    
    if (!fs.existsSync(exePath)) {
      return NextResponse.json({ error: 'Executable not found on server' }, { status: 404 });
    }

    const zip = new AdmZip();
    
    // Add the EXE file to the zip
    zip.addLocalFile(exePath);

    // Add HTML templates and other necessary files
    const templates = [
      'receipt-template.html',
      'receipt-pickup.html',
      'receipt-delivery-shop.html',
      'receipt-delivery-driver.html',
      'install.bat',
      'SumatraPDF-3.4.6-32.exe'
    ];
    for (const tpl of templates) {
      const templatePath = path.join(process.cwd(), 'bridge-app', tpl);
      if (fs.existsSync(templatePath)) {
        zip.addLocalFile(templatePath);
      }
    }

    // Create the custom .env content populated with the tenantId
    const envContent = `SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || ''}
SUPABASE_SERVICE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}
TENANT_ID=${tenantId}
`;
    // Add the custom .env to the zip
    zip.addFile('.env', Buffer.from(envContent, 'utf8'));

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
