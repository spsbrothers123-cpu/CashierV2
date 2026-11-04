import { QRCodeSVG } from 'qrcode.react';

/** Renders a UPI payment URI as a scannable QR on a white tile (keeps contrast in any theme). */
export function UpiQrCode({ value }) {
  return (
    <div className="mx-auto w-fit rounded-[12px] border border-charcoal-900/10 bg-surface-white p-2.5">
      <QRCodeSVG value={value} size={208} level="M" marginSize={1} role="img" aria-label="UPI payment QR code" />
    </div>
  );
}
