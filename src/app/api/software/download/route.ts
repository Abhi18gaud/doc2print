import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileName = searchParams.get('file') || 'QuickPrint-Counter-OS-Setup.exe';

  // Check if built installer exists in desktop/dist
  const distPath = path.join(process.cwd(), 'desktop', 'dist');
  const primaryExe = path.join(distPath, 'QuickPrint-Counter-OS-Setup.exe');
  const versionedExe = path.join(distPath, 'QuickPrint Counter OS Setup 2.4.0.exe');

  const targetPath = fs.existsSync(/*turbopackIgnore: true*/ primaryExe)
    ? primaryExe
    : fs.existsSync(/*turbopackIgnore: true*/ versionedExe)
    ? versionedExe
    : null;

  if (targetPath) {
    const stat = fs.statSync(/*turbopackIgnore: true*/ targetPath);
    const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ targetPath);
    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': stat.size.toString(),
      },
    });
  }

  // Fallback: If not yet built on this machine, provide informative response or zip
  return NextResponse.json(
    {
      status: 'pending_build',
      message: 'QuickPrint installer executable is generating. Please run "npm run build:win" inside the desktop directory to generate the Windows Setup.exe binary.',
      downloadHelp: 'You can launch the desktop app immediately by running "start-quickprint-desktop.bat" in the desktop folder.',
    },
    { status: 200 }
  );
}
