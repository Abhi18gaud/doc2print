import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export async function GET() {
  const repoOwner = 'Abhi18gaud';
  const repoName = 'doc2print';

  // Read authoritative local version from desktop/package.json as primary fallback
  let localVersion = '2.4.0';
  try {
    const desktopPkgPath = path.join(process.cwd(), 'desktop', 'package.json');
    if (fs.existsSync(desktopPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(desktopPkgPath, 'utf8'));
      if (pkg.version) localVersion = pkg.version;
    }
  } catch (err) {
    console.warn('[RELEASES_API] Could not read local desktop package.json:', err);
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'QuickPrint-Release-Fetcher',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`, {
      headers,
      next: { revalidate: 180 }, // Revalidate every 3 minutes
    });

    if (res.ok) {
      const data = await res.json();
      const tagName: string = data.tag_name || `v${localVersion}`;
      const cleanVersion = tagName.replace(/^v/, '');
      const assets: ReleaseAsset[] = data.assets || [];

      // Find Windows installer (Standard Setup .exe)
      const winInstaller = assets.find((a) => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe'))
        || assets.find((a) => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('portable'));

      // Find Windows portable (Standalone .exe)
      const winPortable = assets.find((a) => a.name.toLowerCase().includes('portable') && (a.name.endsWith('.exe') || a.name.endsWith('.zip')));
      const macDmg = assets.find((a) => a.name.endsWith('.dmg'));
      const linuxAppImage = assets.find((a) => a.name.endsWith('.AppImage') || a.name.endsWith('.deb'));

      const downloadUrl = winInstaller?.browser_download_url
        || `https://github.com/${repoOwner}/${repoName}/releases/download/${tagName}/QuickPrint-Counter-OS-Setup-${cleanVersion}.exe`;

      return NextResponse.json(
        {
          version: cleanVersion,
          tagName,
          name: data.name || `QuickPrint Counter OS ${tagName}`,
          releaseDate: data.published_at,
          notes: data.body || 'Production stability improvements and performance enhancements.',
          downloadUrl,
          assets: {
            installer: winInstaller ? { name: winInstaller.name, url: winInstaller.browser_download_url, size: winInstaller.size } : null,
            portable: winPortable ? { name: winPortable.name, url: winPortable.browser_download_url, size: winPortable.size } : null,
            mac: macDmg ? { name: macDmg.name, url: macDmg.browser_download_url } : null,
            linux: linuxAppImage ? { name: linuxAppImage.name, url: linuxAppImage.browser_download_url } : null,
          },
          isPrerelease: !!data.prerelease,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
          },
        }
      );
    }
  } catch (err: any) {
    console.warn('[RELEASES_API] GitHub release fetch error, using local fallback:', err.message);
  }

  // Graceful authoritative fallback
  return NextResponse.json(
    {
      version: localVersion,
      tagName: `v${localVersion}`,
      name: `QuickPrint Counter OS v${localVersion}`,
      releaseDate: new Date().toISOString(),
      notes: 'Standard production build for Windows 10 & 11.',
      downloadUrl: `/api/software/download?file=QuickPrint-Counter-OS-Setup-${localVersion}.exe`,
      assets: null,
      isPrerelease: false,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    }
  );
}
