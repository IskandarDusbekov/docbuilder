import { requireNativeModule } from 'expo';

type DocScannerNative = {
  scan(pageLimit: number): Promise<string[]>;
};

const DocScanner = requireNativeModule<DocScannerNative>('DocScanner');

// Tizim hujjat skanerini ochadi. Skanerlangan sahifalar rasmlarining URI'larini qaytaradi; bekor qilinsa bo'sh ro'yxat.
// pageLimit = 0: cheklovsiz.
export function scanDocument(pageLimit = 0) {
  return DocScanner.scan(pageLimit);
}
