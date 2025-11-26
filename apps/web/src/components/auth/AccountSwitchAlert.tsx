import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AccountSwitchAlertProps {
  open: boolean;
  onSwitchAccount: () => void;
  onCancel: () => void;
  currentAccountInfo?: string;
}

export function AccountSwitchAlert({
  open,
  onSwitchAccount,
  onCancel,
  currentAccountInfo,
}: AccountSwitchAlertProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-500/20 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-xl">
              Dispositivo com Outra Conta
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3 pt-2">
            <p className="text-base">
              Este dispositivo já possui uma conta Bazari configurada{currentAccountInfo ? ` (${currentAccountInfo})` : ''}.
            </p>
            <p className="text-base font-medium text-foreground">
              Você está tentando fazer login com uma conta Google diferente.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">
                ⚠️ Importante:
              </p>
              <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                <li>Trocar de conta irá <strong>apagar os dados locais</strong> da conta anterior</li>
                <li>Você precisará ter o <strong>backup da seed phrase</strong> para recuperar a conta antiga</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancelar e Manter Conta Atual
          </Button>
          <Button
            variant="destructive"
            onClick={onSwitchAccount}
            className="w-full sm:w-auto"
          >
            Trocar de Conta (Limpar Dados Locais)
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
