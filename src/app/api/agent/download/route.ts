import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopIdentifier = searchParams.get('shopId') || searchParams.get('slug') || '';

    let shop: { id: string; name: string; qr_code_slug: string } | null = null;

    // 1. Try finding by ID or QR slug
    if (shopIdentifier) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shopIdentifier);
      const query = supabase.from('shops').select('id, name, qr_code_slug');

      const { data } = isUuid
        ? await query.eq('id', shopIdentifier).maybeSingle()
        : await query.eq('qr_code_slug', shopIdentifier).maybeSingle();

      shop = data;
    }

    // 2. If not found or omitted, fallback to first shop in DB
    if (!shop) {
      const { data: fallbackShop } = await supabase
        .from('shops')
        .select('id, name, qr_code_slug')
        .limit(1)
        .maybeSingle();

      shop = fallbackShop || {
        id: 'default-counter',
        name: 'QuickPrint Counter',
        qr_code_slug: 'counter',
      };
    }

    const agentDir = path.resolve(process.cwd(), 'agent');
    const zip = new JSZip();

    // 1. Customized config.json for this exact shop
    const configData = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iixcylrdqfdxfsldcygm.supabase.co',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      shopId: shop.id,
      shopName: shop.name,
      printerName: '',
      simulateIfNoPrinter: true,
      tempDir: './spool_temp',
    };

    zip.file('config.json', JSON.stringify(configData, null, 2));

    // 2. Add agent runtime files
    const filesToInclude = ['package.json', 'index.js', 'printer.js', 'start-agent.bat'];
    for (const fileName of filesToInclude) {
      const filePath = path.join(agentDir, fileName);
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath);
        zip.file(fileName, fileContent);
      }
    }

    // 3. Add legal EULA & License files
    const eulaContent = `================================================================================
QUICKPRINT TECHNOLOGIES — END USER LICENSE AGREEMENT (EULA)
================================================================================
Version 2.4 (September 2026)

1. GRANT OF LICENSE: QuickPrint grants you a non-exclusive license to use this
   print agent software solely for automated commercial print kiosk counter operations.

2. PRIVACY & AUTO-PURGE GUARANTEE:
   This software downloads documents into a temporary operating system buffer
   strictly for spooling to the physical printer. All buffer files are automatically
   deleted and purged immediately following print completion. Retaining or archiving
   customer identity documents without authorization is strictly prohibited.

3. SUPPORTED HARDWARE:
   Compatible with HP LaserJet, Canon imageCLASS, Epson EcoTank, Brother DCP,
   Ricoh, Konica Minolta, and all standard Windows spooler-compatible devices.
================================================================================`;
    zip.file('EULA.txt', eulaContent);
    zip.file('LICENSE.txt', eulaContent);

    // 4. Add README instructions inside the zip
    const readmeContent = `================================================================================
QUICKPRINT LOCAL PRINT AGENT — OFFICIAL INSTALLATION GUIDE
================================================================================
Shop: ${shop.name}
Shop ID: ${shop.id}
Counter QR Slug: ${shop.qr_code_slug}
================================================================================

HOW TO RUN:
1. Ensure Node.js (LTS v18+) is installed on your Windows PC:
   https://nodejs.org

2. Double-click "start-agent.bat".
   A console window will appear and connect to QuickPrint Cloud.

3. That's it! When customers scan your counter QR code and upload files,
   prints will dispense automatically in < 1.5 seconds without manual dialogs.

AUTO-START ON WINDOWS BOOT (PRO TIP):
- Press Win + R, type: shell:startup
- Right-click "start-agent.bat" -> Create Shortcut.
- Paste the shortcut into the Startup folder.
The agent will now launch automatically whenever your PC turns on!
================================================================================`;
    zip.file('README.txt', readmeContent);

    // Generate uint8array binary
    const zipBytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return new Response(zipBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="quickprint-agent-${shop.qr_code_slug}.zip"`,
        'Content-Length': zipBytes.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Agent zip download error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate agent package';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
