import { useState } from 'react';
import { getHardwareConfig, saveHardwareConfig, printThermalReceipt, triggerCashDrawer } from '../../services/printerService';
import { useToast } from '../../hooks/useToast';
import { Printer, Usb, Wifi, Monitor, HardDrive, Check, Play, RefreshCw, X } from 'lucide-react';
import Button from './Button';

export default function PrinterConfigModal({ isOpen, onClose }) {
  const { toast } = useToast();
  const [config, setConfig] = useState(() => getHardwareConfig());
  const [testingPrint, setTestingPrint] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);

  if (!isOpen) return null;

  const handleChange = (key, val) => {
    setConfig(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = () => {
    saveHardwareConfig(config);
    toast.success('Hardware peripheral configuration saved.');
    onClose();
  };

  const handleTestPrint = async () => {
    setTestingPrint(true);
    try {
      const testReceipt = {
        shopName: 'ShopNest Hardware Test',
        branch: 'POS Terminal #1',
        saleId: 'TEST-' + Math.floor(Math.random() * 8999 + 1000),
        items: [
          { product_name: 'Thermal Receipt Roll (80mm)', quantity: 2, price: 3.50 },
          { product_name: 'USB Barcode Scanner Pro', quantity: 1, price: 45.00 }
        ],
        totalAmount: 52.00,
        tenderedAmount: 60.00,
        paymentMethod: 'Cash'
      };

      const res = await printThermalReceipt(testReceipt);
      if (res.native) {
        toast.success('Test receipt sent to native ESC/POS printer!');
      } else {
        toast.success(`Generated ${res.bytesCount} raw ESC/POS bytes! Browser fallback active.`);
      }
    } catch (err) {
      toast.error('Test print failed: ' + err.message);
    } finally {
      setTestingPrint(false);
    }
  };

  const handleTestDrawer = async () => {
    setTestingDrawer(true);
    try {
      const res = await triggerCashDrawer();
      if (res.native) {
        toast.success('RJ11 pulse sent! Cash drawer should be open.');
      } else {
        toast.success('Simulated RJ11 drawer kick-out pulse (ESC p 0 25 250).');
      }
    } catch (err) {
      toast.error('Drawer trigger failed: ' + err.message);
    } finally {
      setTestingDrawer(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-[#d9d4c8] shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-5 bg-[#004643] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Printer size={22} className="text-[#e5f2f1]" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Hardware & Peripheral Settings</h3>
              <p className="text-xs text-[#c8ddda]">Configure ESC/POS printers, cash drawers, and barcode scanners</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          {/* Printer Type Selection */}
          <div>
            <label className="block text-xs font-bold text-[#697773] uppercase tracking-wider mb-3">
              Receipt Printer Connection Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'BROWSER', label: 'Browser Print', icon: Monitor, desc: 'Standard window.print()' },
                { id: 'USB', label: 'Direct USB', icon: Usb, desc: 'Raw ESC/POS USB stream' },
                { id: 'COM', label: 'Serial COM Port', icon: HardDrive, desc: 'RS-232 / Virtual COM' },
                { id: 'NETWORK', label: 'Network IP', icon: Wifi, desc: 'Ethernet / Wi-Fi Thermal' }
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = config.type === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleChange('type', type.id)}
                    className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      isSelected 
                        ? 'bg-[#e5f2f1] border-[#004643] ring-1 ring-[#004643]' 
                        : 'bg-white border-[#d9d4c8] hover:bg-[#faf8f2]'
                    }`}
                  >
                    <Icon size={20} className={isSelected ? 'text-[#004643] mt-0.5' : 'text-[#697773] mt-0.5'} />
                    <div>
                      <p className={`text-sm font-bold ${isSelected ? 'text-[#004643]' : 'text-[#182321]'}`}>
                        {type.label}
                      </p>
                      <p className="text-[11px] text-[#697773] mt-0.5">{type.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Port / Address Setting (Visible if not browser) */}
          {config.type !== 'BROWSER' && (
            <div className="p-4 bg-[#faf8f2] rounded-xl border border-[#ebe6dc] space-y-3">
              <label className="block text-xs font-bold text-[#182321]">
                {config.type === 'NETWORK' ? 'Printer IP Address & Port' : 'USB / Serial Device Port'}
              </label>
              <input
                type="text"
                value={config.type === 'NETWORK' ? config.ip : config.port}
                onChange={(e) => handleChange(config.type === 'NETWORK' ? 'ip' : 'port', e.target.value)}
                placeholder={config.type === 'NETWORK' ? '192.168.1.50' : 'COM3 or /dev/usb/lp0'}
                className="w-full px-3.5 py-2 rounded-lg border border-[#d9d4c8] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#004643]"
              />
            </div>
          )}

          {/* Paper Roll & Hardware Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#697773] uppercase tracking-wider mb-2">
                Paper Roll Width
              </label>
              <select
                value={config.paperWidth}
                onChange={(e) => handleChange('paperWidth', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#d9d4c8] bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004643]"
              >
                <option value="80mm">80mm Standard Roll (48 cols)</option>
                <option value="58mm">58mm Compact Roll (32 cols)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#697773] uppercase tracking-wider mb-2">
                Barcode Scanner Mode
              </label>
              <select
                value={config.barcodeScannerMode}
                onChange={(e) => handleChange('barcodeScannerMode', e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[#d9d4c8] bg-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#004643]"
              >
                <option value="HID">HID Keyboard Emulation</option>
                <option value="SERIAL">Serial COM Background Port</option>
              </select>
            </div>
          </div>

          {/* Toggle checkboxes */}
          <div className="space-y-3 pt-2 border-t border-[#ebe6dc]">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.autoCut}
                onChange={(e) => handleChange('autoCut', e.target.checked)}
                className="w-4 h-4 rounded text-[#004643] focus:ring-[#004643]"
              />
              <span className="text-sm font-semibold text-[#182321]">
                Auto-cut paper roll after printing receipt (GS V command)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={config.openDrawerOnCash}
                onChange={(e) => handleChange('openDrawerOnCash', e.target.checked)}
                className="w-4 h-4 rounded text-[#004643] focus:ring-[#004643]"
              />
              <span className="text-sm font-semibold text-[#182321]">
                Trigger RJ11 cash drawer kick-out pulse on Cash payments
              </span>
            </label>
          </div>

          {/* Hardware Diagnostic Tests */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hardware Diagnostics</p>
              <p className="text-xs text-slate-500 mt-0.5">Test communication with physical store peripherals</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={testingPrint}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-all"
              >
                {testingPrint ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Test Print
              </button>
              <button
                type="button"
                onClick={handleTestDrawer}
                disabled={testingDrawer}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition-all"
              >
                {testingDrawer ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                Test Drawer
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#faf8f2] border-t border-[#ebe6dc] flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Configuration
          </Button>
        </div>

      </div>
    </div>
  );
}
