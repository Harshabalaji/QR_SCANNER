import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform } from 'react-native';

interface BarcodeScannerOptions {
  /** Max ms between keystrokes to consider it scanner input (default: 80) */
  maxKeystrokeInterval?: number;
  /** Minimum barcode length to accept (default: 3) */
  minBarcodeLength?: number;
  /** Cooldown ms after a successful scan before accepting another (default: 500) */
  cooldownMs?: number;
  /** Whether the scanner is active (default: true) */
  enabled?: boolean;
  /** Callback when a barcode is scanned */
  onScan?: (barcode: string) => void;
}

interface BarcodeScannerResult {
  lastScannedBarcode: string | null;
  isScanning: boolean;
  clearLastScan: () => void;
}

export function useBarcodeScanner(options: BarcodeScannerOptions = {}): BarcodeScannerResult {
  const {
    maxKeystrokeInterval = 80,
    minBarcodeLength = 3,
    cooldownMs = 500,
    enabled = true,
    onScan,
  } = options;

  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const bufferRef = useRef<string>('');
  const lastKeystrokeRef = useRef<number>(0);
  const cooldownRef = useRef<boolean>(false);
  const onScanRef = useRef(onScan);
  
  // Keep onScan ref up to date without re-creating the listener
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const clearLastScan = useCallback(() => {
    setLastScannedBarcode(null);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeystrokeRef.current;

      // Check if the active element is a text input that should capture typing
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' ||
        (activeEl as HTMLElement).contentEditable === 'true'
      );

      // Check if this input has the data attribute marking it as a barcode field
      const isBarcodeInput = activeEl && (activeEl as HTMLElement).dataset?.barcodeInput === 'true';

      // If an input is focused that is NOT a barcode input, let normal typing work
      if (isInputFocused && !isBarcodeInput) {
        bufferRef.current = '';
        return;
      }

      // If Enter is pressed, process the buffer
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        const barcode = bufferRef.current.trim();
        bufferRef.current = '';
        setIsScanning(false);

        if (barcode.length >= minBarcodeLength && !cooldownRef.current) {
          cooldownRef.current = true;
          setLastScannedBarcode(barcode);
          
          if (onScanRef.current) {
            onScanRef.current(barcode);
          }

          setTimeout(() => {
            cooldownRef.current = false;
          }, cooldownMs);
        }
        return;
      }

      // Ignore modifier keys, function keys, etc.
      if (e.key.length !== 1) return;

      // If too much time has passed, start a new buffer
      if (timeSinceLastKey > maxKeystrokeInterval) {
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
      lastKeystrokeRef.current = now;

      // Show scanning state when buffer is building up quickly
      if (bufferRef.current.length >= 2) {
        setIsScanning(true);
      }

      // Prevent the character from appearing in other inputs when scanning
      if (bufferRef.current.length >= minBarcodeLength) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, maxKeystrokeInterval, minBarcodeLength, cooldownMs]);

  return {
    lastScannedBarcode,
    isScanning,
    clearLastScan,
  };
}
