/**
 * Robust IndexedDB client storage for Gaurprint Customer Web App.
 * Persists uploaded files (PDFs, Images, Photos) and their print configurations
 * across accidental page reloads, tab switches, and checkout navigations.
 */

import { FileItem } from '@/app/kiosk/[shopSlug]/page';

const DB_NAME = 'GaurprintKioskDB';
const DB_VERSION = 1;
const STORE_NAME = 'kiosk_files';

interface StoredFileRecord {
  id: string;
  shopSlug: string;
  blob: Blob;
  name: string;
  size: number;
  type: 'pdf' | 'png' | 'jpg' | 'doc';
  mode: 'document' | 'photo' | 'image';
  pages: number;
  selectedPages: number[];
  paperSize: string;
  paperType: string;
  quality: string;
  sides: 'single' | 'duplex';
  colorMode: 'bw' | 'color';
  photoSize: string;
  photoPaper: string;
  photoQuality: string;
  orientation: 'portrait' | 'landscape';
  copies: number;
  fitMode?: string;
  alignment?: string;
  customWidthMm?: number;
  customHeightMm?: number;
  borderless?: boolean;
  marginMm?: number;
  crop?: any;
  adjustments?: any;
  renderedDataUrl?: string;
  editState?: any;
  pdfPageRotations?: Record<number, number>;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('shopSlug', 'shopSlug', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save all currently active files in the kiosk cart into IndexedDB.
 */
export async function persistKioskFiles(shopSlug: string, items: FileItem[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // First clear existing items for this specific shop
    const index = store.index('shopSlug');
    const request = index.getAllKeys(shopSlug);

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result;
        for (const k of keys) {
          store.delete(k);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    // Write all current items
    for (const item of items) {
      let blob: Blob;
      if (item.file) {
        blob = item.file;
      } else {
        // If file object is not available directly, fetch from previewUrl
        try {
          const res = await fetch(item.previewUrl);
          blob = await res.blob();
        } catch {
          blob = new Blob([], { type: 'application/octet-stream' });
        }
      }

      const record: StoredFileRecord = {
        id: item.id,
        shopSlug,
        blob,
        name: item.name,
        size: item.size,
        type: item.type,
        mode: item.mode,
        pages: item.pages,
        selectedPages: item.selectedPages || [],
        paperSize: item.paperSize,
        paperType: item.paperType,
        quality: item.quality,
        sides: item.sides,
        colorMode: item.colorMode,
        photoSize: item.photoSize,
        photoPaper: item.photoPaper,
        photoQuality: item.photoQuality,
        orientation: item.orientation,
        copies: item.copies,
        fitMode: item.fitMode,
        alignment: (item as any).alignment,
        customWidthMm: (item as any).customWidthMm,
        customHeightMm: (item as any).customHeightMm,
        borderless: (item as any).borderless,
        marginMm: (item as any).marginMm,
        crop: (item as any).crop,
        adjustments: (item as any).adjustments,
        renderedDataUrl: item.renderedDataUrl,
        editState: item.editState,
        pdfPageRotations: (item as any).pdfPageRotations,
        timestamp: Date.now(),
      };

      store.put(record);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist kiosk files to IndexedDB:', err);
  }
}

/**
 * Retrieve persisted kiosk files for this shop upon page reload.
 */
export async function restoreKioskFiles(shopSlug: string): Promise<FileItem[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('shopSlug');
    const request = index.getAll(shopSlug);

    const records = await new Promise<StoredFileRecord[]>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const restored: FileItem[] = [];

    for (const r of records) {
      // Re-create a real File and ObjectURL from the stored Blob
      const fileType =
        r.type === 'pdf'
          ? 'application/pdf'
          : r.type === 'png'
          ? 'image/png'
          : r.type === 'jpg'
          ? 'image/jpeg'
          : 'application/octet-stream';

      const file = new File([r.blob], r.name, {
        type: r.blob.type || fileType,
        lastModified: r.timestamp || Date.now(),
      });

      const previewUrl = URL.createObjectURL(file);

      restored.push({
        id: r.id,
        file,
        name: r.name,
        size: r.size,
        type: r.type,
        mode: r.mode,
        previewUrl,
        pages: r.pages,
        selectedPages: r.selectedPages && r.selectedPages.length > 0 ? r.selectedPages : [1],
        paperSize: r.paperSize || 'a4',
        paperType: r.paperType || 'plain',
        quality: r.quality || 'normal',
        sides: r.sides || 'single',
        colorMode: r.colorMode || 'bw',
        photoSize: r.photoSize || '4x6',
        photoPaper: r.photoPaper || 'glossy',
        photoQuality: r.photoQuality || 'standard',
        orientation: r.orientation || 'portrait',
        copies: r.copies || 1,
        fitMode: (r.fitMode as any) || 'fit',
        alignment: (r.alignment as any) || 'center',
        customWidthMm: r.customWidthMm,
        customHeightMm: r.customHeightMm,
        borderless: r.borderless ?? false,
        marginMm: r.marginMm,
        crop: r.crop,
        adjustments: r.adjustments,
        renderedDataUrl: r.renderedDataUrl,
        editState: r.editState,
        ...((r as any).pdfPageRotations ? { pdfPageRotations: (r as any).pdfPageRotations } : {}),
      });
    }

    return restored;
  } catch (err) {
    console.warn('Could not restore kiosk files from IndexedDB:', err);
    return [];
  }
}

/**
 * Remove a single file record by ID.
 */
export async function removePersistedKioskFile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete file from IndexedDB:', err);
  }
}

/**
 * Clear all persisted files for a shop (after successful checkout or reset).
 */
export async function clearPersistedKioskFiles(shopSlug: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('shopSlug');
    const request = index.getAllKeys(shopSlug);

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result;
        for (const k of keys) {
          store.delete(k);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear shop files from IndexedDB:', err);
  }
}
