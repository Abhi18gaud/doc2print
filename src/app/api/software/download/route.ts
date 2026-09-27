import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileName = searchParams.get('file') || 'QuickPrint-Counter-OS-Setup.exe';

  // Check if built installer exists in desktop/dist
  const distPath = path.join(process.cwd(), 'desktop', 'dist');
  let targetPath: string | null = null;

  if (fs.existsSync(distPath)) {
    try {
      const files = fs.readdirSync(distPath);
      // Prefer exact match or latest generated setup .exe
      const matching = files.filter((f) => f.endsWith('.exe') && !f.includes('.blockmap'));
      const directMatch = matching.find((f) => f.toLowerCase() === fileName.toLowerCase());
      const setupMatch = matching.find((f) => f.includes('Setup') || f.includes('QuickPrint'));

      if (directMatch) {
        targetPath = path.join(distPath, directMatch);
      } else if (setupMatch) {
        targetPath = path.join(distPath, setupMatch);
      }
    } catch (e) {
      console.warn('[DOWNLOAD_ROUTE] Could not read dist directory:', e);
    }
  }

  // If found locally on the current machine, stream directly
  if (targetPath && fs.existsSync(targetPath)) {
    const stat = fs.statSync(targetPath);
    const fileStream = fs.createReadStream(targetPath);
    return new NextResponse(fileStream as any, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': stat.size.toString(),
      },
    });
  }

  // Authoritative fallback: Redirect to GitHub Releases latest download
  const githubReleaseUrl = `https://github.com/Abhi18gaud/doc2print/releases/latest/download/${fileName}`;
  return NextResponse.redirect(githubReleaseUrl, { status: 302 });
}
