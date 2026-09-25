import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';

export interface FileAnalysisResult {
  pages: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  isPdf: boolean;
  isWord: boolean;
  isImage: boolean;
  formattedSize: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export async function inspectUploadedFile(file: File): Promise<FileAnalysisResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const fileType = file.type || 'application/octet-stream';
  const lowerName = fileName.toLowerCase();
  const isPdf = fileType === 'application/pdf' || lowerName.endsWith('.pdf');
  const isDocx = lowerName.endsWith('.docx') || fileType.includes('wordprocessingml');
  const isDoc = lowerName.endsWith('.doc') || fileType.includes('msword');
  const isWord = isDocx || isDoc;
  const isImage = fileType.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(lowerName);

  let pages = 1;

  if (isPdf) {
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      pages = Math.max(1, pdfDoc.getPageCount());
    } catch (err) {
      console.warn('Could not parse PDF pages, falling back to 1:', err);
      pages = 1;
    }
  } else if (isDocx) {
    try {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);

      // 1. Check docProps/app.xml for standard <Pages> metadata
      const appXmlFile = zip.file('docProps/app.xml');
      if (appXmlFile) {
        const appXml = await appXmlFile.async('text');
        const pageMatch = appXml.match(/<Pages>(\d+)<\/Pages>/i);
        if (pageMatch && parseInt(pageMatch[1], 10) > 0) {
          pages = parseInt(pageMatch[1], 10);
        } else {
          // If <Pages> is 1 or missing, check Word count (average ~250-280 words per printed page)
          const wordMatch = appXml.match(/<Words>(\d+)<\/Words>/i);
          if (wordMatch && parseInt(wordMatch[1], 10) > 0) {
            const words = parseInt(wordMatch[1], 10);
            pages = Math.max(1, Math.ceil(words / 280));
          }
        }
      }

      // 2. Also check word/document.xml for hard page breaks
      if (pages <= 1) {
        const docXmlFile = zip.file('word/document.xml');
        if (docXmlFile) {
          const docXml = await docXmlFile.async('text');
          const hardBreaks = (docXml.match(/<w:br\s+[^>]*w:type="page"/gi) || []).length;
          const renderedBreaks = (docXml.match(/<w:lastRenderedPageBreak/gi) || []).length;
          const detectedBreaks = Math.max(hardBreaks, renderedBreaks);
          if (detectedBreaks > 0) {
            pages = detectedBreaks + 1;
          }
        }
      }
    } catch (err) {
      console.warn('Could not inspect DOCX file:', err);
      pages = 1;
    }
  }

  return {
    pages,
    fileName,
    fileSize,
    fileType,
    isPdf,
    isWord,
    isImage,
    formattedSize: formatBytes(fileSize),
  };
}
