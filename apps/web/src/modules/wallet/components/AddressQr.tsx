import { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface AddressQrProps {
  address: string;
  size?: number;
}

export function AddressQr({ address, size = 180 }: AddressQrProps) {
  const value = useMemo(() => address.trim(), [address]);

  if (!value) {
    return null;
  }

  return (
    <div className="inline-flex items-center justify-center rounded-lg border border-border/60 bg-card p-3">
      <QRCodeCanvas value={value} size={size} includeMargin className="h-auto w-auto" />
    </div>
  );
}

export default AddressQr;
