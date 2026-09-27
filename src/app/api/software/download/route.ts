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

  // Authoritative dynamic lookup: Query GitHub API for the latest release asset
  const repoOwner = 'Abhi18gaud';
  const repoName = 'doc2print';
  const isPortable = fileName.toLowerCase().includes('portable') || fileName.endsWith('.zip');

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'QuickPrint-Download-Proxy',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers,
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      const assets = data.assets || [];

      let matchedAsset = null;
      if (isPortable) {
        matchedAsset = assets.find((a: any) => a.name.toLowerCase().includes('portable'));
      } else {
        matchedAsset = assets.find((a: any) => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('portable'))
          || assets.find((a: any) => a.name.endsWith('.exe'));
      }

      if (matchedAsset && matchedAsset.browser_download_url) {
        return NextResponse.redirect(matchedAsset.browser_download_url, { status: 302 });
      }
    }
  } catch (err) {
    console.warn('[DOWNLOAD_ROUTE] Could not fetch GitHub latest release assets:', err);
  }

  // If exact latest/download link: try direct URL
  const githubReleaseUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest/download/${fileName}`;
  return NextResponse.redirect(githubReleaseUrl, { status: 302 });
}
