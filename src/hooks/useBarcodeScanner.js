import { useEffect, useRef } from 'react';

/**
 * Custom React hook for capturing USB/Bluetooth Barcode Scanners in Mode A (HID Keyboard Emulation).
 * Scanners rapidly type alphanumeric characters followed by an Enter keypress (< 50ms interval).
 */
export const useBarcodeScanner = ({ onScan, enabled = true }) => {
  const bufferRef = useRef('');
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore special modifier keys
      if (['Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape'].includes(e.key)) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastTimeRef.current;

      // If time since last keystroke is > 100ms, assume human typing and reset buffer
      if (timeDiff > 100) {
        bufferRef.current = '';
      }
      lastTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        // A valid barcode SKU is typically at least 3 characters long
        if (barcode.length >= 3) {
          // If the user wasn't actively typing in a multiline textarea, trigger onScan
          const activeEl = document.activeElement;
          const isTextarea = activeEl && activeEl.tagName === 'TEXTAREA';
          if (!isTextarea) {
            e.preventDefault();
            console.log(`[BarcodeScanner] Captured barcode stream: "${barcode}"`);
            onScan?.(barcode);
            bufferRef.current = '';
            return;
          }
        }
        bufferRef.current = '';
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, enabled]);
};
