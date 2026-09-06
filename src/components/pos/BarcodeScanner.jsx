import { useState } from 'react';
import { ScanLine, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/**
 * Barcode scanner UI for Phase 1.
 *
 * Flow: Scan -> Find Product -> Add to Cart -> Update Quantity (see
 * project spec section 14). Camera-based live scanning depends on
 * device hardware access and wasn't part of any existing scanner
 * module we could reuse, so this modal currently accepts a manual /
 * hardware-keyboard-wedge barcode entry (the common pattern for
 * USB/Bluetooth POS scanners, which type the barcode + Enter). True
 * camera capture (e.g. via a barcode-reading library) is a follow-up
 * once it's confirmed which scanner hardware or library the shop uses.
 */
export function BarcodeScanner({ open, onClose, onLookup, looking, notFound }) {
  const [code, setCode] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) return;
    onLookup(code.trim());
  }

  function handleClose() {
    setCode('');
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Scan Barcode">
      <div className="flex flex-col items-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-egg-300/25 text-egg-600">
          <ScanLine className="size-8" aria-hidden />
        </div>
        <p className="mb-4 max-w-xs text-center text-sm text-charcoal-500">
          Scan with a connected barcode scanner, or type the code below.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <Input
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Barcode number"
            inputMode="numeric"
          />

          {notFound && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-danger-500/10 px-3 py-2.5 text-sm text-danger-600">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>Product not found for that barcode.</span>
            </div>
          )}

          <Button type="submit" loading={looking} className="mt-4 w-full" size="lg">
            Find Product
          </Button>
        </form>
      </div>
    </Modal>
  );
}
