import { PDFDocument } from 'pdf-lib';

export interface FileAnalysisResult {
  pages: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  isPdf: boolean;
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
  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

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
  }

  return {
    pages,
    fileName,
    fileSize,
    fileType,
    isPdf,
    formattedSize: formatBytes(fileSize),
  };
}
