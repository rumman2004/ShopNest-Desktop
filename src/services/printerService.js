/**
 * ShopNest ESC/POS Hardware Peripheral Driver & Print Engine
 * Handles binary command formatting for thermal receipt printers (58mm/80mm)
 * and RJ11/RJ12 electronic cash drawer kick-out pulses.
 */
import { isDesktop, invokeNative } from './tauriBridge';

const PRINTER_CONFIG_KEY = 'shopnest_hardware_config';

const DEFAULT_CONFIG = {
  type: 'BROWSER', // 'USB' | 'COM' | 'NETWORK' | 'BROWSER'
  port: 'COM3',
  ip: '192.168.1.50',
  paperWidth: '80mm', // '58mm' | '80mm'
  autoCut: true,
  openDrawerOnCash: true,
  barcodeScannerMode: 'HID', // 'HID' | 'SERIAL'
  scannerPort: 'COM4'
};

// ESC/POS Command Byte Constants
export const ESC_POS = {
  INIT: [0x1B, 0x40],
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  DOUBLE_HEIGHT: [0x1B, 0x21, 0x10],
  NORMAL_TEXT: [0x1B, 0x21, 0x00],
  LINE_FEED: [0x0A],
  PAPER_CUT: [0x1D, 0x56, 0x41, 0x03], // GS V A 3 (Partial cut with feed)
  DRAWER_KICK: [0x1B, 0x70, 0x00, 0x19, 0xFA] // ESC p 0 25 250 (RJ11 Kick-out pulse)
};

/**
 * Get saved printer & hardware configuration from localStorage.
 */
export const getHardwareConfig = () => {
  try {
    const saved = localStorage.getItem(PRINTER_CONFIG_KEY);
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
};

/**
 * Save hardware configuration to localStorage.
 */
export const saveHardwareConfig = (config) => {
  const current = getHardwareConfig();
  const merged = { ...current, ...config };
  localStorage.setItem(PRINTER_CONFIG_KEY, JSON.stringify(merged));
  return merged;
};

/**
 * Helper to convert text string to ASCII/UTF-8 byte array.
 */
const textToBytes = (text) => {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text + '\n'));
};

/**
 * Generate raw binary ESC/POS byte sequence for a receipt.
 */
export const buildEscPosCommands = (receipt, config = getHardwareConfig()) => {
  const bytes = [];
  const push = (...arrs) => arrs.forEach(arr => bytes.push(...arr));
  const maxChars = config.paperWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(maxChars) + '\n';

  // 1. Initialize printer
  push(ESC_POS.INIT);

  // 2. Store Header (Centered, Bold, Double Height)
  push(ESC_POS.ALIGN_CENTER, ESC_POS.BOLD_ON, ESC_POS.DOUBLE_HEIGHT);
  push(textToBytes(receipt.shopName || 'ShopNest POS'));
  push(ESC_POS.NORMAL_TEXT, ESC_POS.BOLD_OFF);

  if (receipt.branch || receipt.address) {
    push(textToBytes(receipt.branch || receipt.address || ''));
  }
  push(textToBytes(`Date: ${new Date().toLocaleString()}`));
  if (receipt.saleId || receipt.invoiceNumber) {
    push(textToBytes(`Invoice #: ${receipt.saleId || receipt.invoiceNumber || 'N/A'}`));
  }
  push(textToBytes(divider));

  // 3. Itemized Lines (Left aligned)
  push(ESC_POS.ALIGN_LEFT);
  if (receipt.items && Array.isArray(receipt.items)) {
    receipt.items.forEach(item => {
      const name = item.product_name || item.name || 'Item';
      const qty = item.quantity || 1;
      const price = Number(item.price || 0).toFixed(2);
      const lineTotal = (qty * Number(item.price || 0)).toFixed(2);
      
      // Print item name
      push(textToBytes(`${name.substring(0, maxChars)}`));
      // Print qty x price and line total aligned right
      const qtyStr = `  ${qty} x ${price}`;
      const spaces = Math.max(1, maxChars - qtyStr.length - lineTotal.length);
      push(textToBytes(`${qtyStr}${' '.repeat(spaces)}${lineTotal}`));
    });
  }
  push(textToBytes(divider));

  // 4. Totals & Tender (Right aligned / Structured)
  push(ESC_POS.BOLD_ON);
  const totalStr = `TOTAL: $${Number(receipt.totalAmount || 0).toFixed(2)}`;
  push(textToBytes(totalStr.padStart(maxChars)));
  
  if (receipt.tenderedAmount !== undefined) {
    const tenderStr = `Tendered: $${Number(receipt.tenderedAmount || 0).toFixed(2)}`;
    push(textToBytes(tenderStr.padStart(maxChars)));
    
    const change = Number(receipt.tenderedAmount || 0) - Number(receipt.totalAmount || 0);
    const changeStr = `Change: $${Math.max(0, change).toFixed(2)}`;
    push(textToBytes(changeStr.padStart(maxChars)));
  }
  push(ESC_POS.BOLD_OFF, ESC_POS.NORMAL_TEXT);
  push(textToBytes(divider));

  // 5. Footer
  push(ESC_POS.ALIGN_CENTER);
  push(textToBytes('Thank you for shopping with us!'));
  push(textToBytes('Powered by ShopNest POS'));
  push(ESC_POS.LINE_FEED, ESC_POS.LINE_FEED);

  // 6. Optional Cash Drawer Kick (if configured for cash tender)
  if (config.openDrawerOnCash && (receipt.paymentMethod === 'Cash' || !receipt.paymentMethod)) {
    push(ESC_POS.DRAWER_KICK);
  }

  // 7. Auto Paper Cut
  if (config.autoCut) {
    push(ESC_POS.PAPER_CUT);
  }

  return bytes;
};

/**
 * Execute thermal printing via native OS driver or browser fallback.
 */
export const printThermalReceipt = async (receiptData) => {
  const config = getHardwareConfig();
  const escposBytes = buildEscPosCommands(receiptData, config);

  console.log(`[PrinterService] Generated ${escposBytes.length} ESC/POS command bytes for printer [${config.type}].`);

  if (isDesktop() && config.type !== 'BROWSER') {
    try {
      console.log(`[PrinterService] Dispatching raw binary stream to desktop hardware driver...`);
      const res = await invokeNative('send_escpos_command', {
        printerType: config.type,
        port: config.port,
        ip: config.ip,
        payload: escposBytes
      });
      return { success: true, native: true, message: 'Receipt printed directly to thermal peripheral.' };
    } catch (err) {
      console.error('[PrinterService] Native ESC/POS print failed. Falling back to web preview:', err);
    }
  }

  // Fallback / Browser Preview mode
  console.log('[PrinterService] Using browser print pipeline.');
  return { success: true, native: false, bytesCount: escposBytes.length };
};

/**
 * Trigger physical cash drawer kick-out pulse via RJ11 printer interface.
 */
export const triggerCashDrawer = async () => {
  const config = getHardwareConfig();
  console.log('[PrinterService] Transmitting RJ11 kick-out byte sequence (ESC p 0 25 250)...');

  if (isDesktop() && config.type !== 'BROWSER') {
    try {
      await invokeNative('send_escpos_command', {
        printerType: config.type,
        port: config.port,
        ip: config.ip,
        payload: ESC_POS.DRAWER_KICK
      });
      return { success: true, native: true };
    } catch (err) {
      console.error('[PrinterService] Native cash drawer kick failed:', err);
    }
  }

  return { success: true, native: false, simulated: true };
};
