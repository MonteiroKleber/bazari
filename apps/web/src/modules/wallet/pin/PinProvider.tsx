import { useEffect, useState } from 'react';
import { PinDialog } from '@/modules/wallet/components/PinDialog';
import { PinService, type PinState } from './PinService';

export function PinProvider() {
  const [state, setState] = useState<PinState>({ open: false });

  useEffect(() => {
    return PinService.subscribe(setState);
  }, []);

  if (!state.open) return null;

  return (
    <PinDialog
      open={state.open}
      title={state.title || 'Confirme com o PIN'}
      description={state.description || 'Digite o PIN do cofre'}
      label={state.label || 'PIN'}
      cancelText={state.cancelText || 'Cancelar'}
      confirmText={state.confirmText || 'Confirmar'}
      loading={false}
      error={state.error || undefined}
      onCancel={() => PinService.cancel()}
      onConfirm={(pin) => void PinService.confirm(pin)}
    />
  );
}
