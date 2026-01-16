import { useState } from 'react';
import { Settings, Key, RefreshCw, AlertTriangle, Check, X, Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Switch } from '../ui/switch';
import { chatCrypto } from '@/lib/chat/crypto';
import { useNotifications } from '@/hooks/useNotifications';

interface ChatSettingsProps {
  onReset?: () => void;
}

export function ChatSettings({ onReset }: ChatSettingsProps) {
  const [open, setOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);

  const sessionCount = chatCrypto.listSessions().length;
  const {
    permission,
    isSupported,
    isPushSubscribed,
    soundEnabled,
    requestPermission,
    subscribePush,
    unsubscribePush,
    setSoundEnabled,
    testNotification,
    testSound,
  } = useNotifications();

  const handleResetE2EE = async () => {
    setResetting(true);
    try {
      // Limpar chaves e sessões do localStorage
      localStorage.removeItem('chat_keypair');
      localStorage.removeItem('chat_sessions');

      // Re-inicializar o crypto (vai gerar novas chaves)
      await chatCrypto.initialize();

      setResetSuccess(true);
      setConfirmResetOpen(false);

      // Chamar callback de reset
      onReset?.();

      // Recarregar a página após 1.5s para aplicar as novas chaves
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to reset E2EE:', error);
      alert('Erro ao resetar criptografia. Tente novamente.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" title="Configurações do chat">
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Configurações do Chat</DialogTitle>
            <DialogDescription>
              Gerencie suas configurações de criptografia e privacidade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Seção de Notificações */}
            {isSupported && (
              <>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Notificações
                </h3>

                {/* Push Notifications */}
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  {isPushSubscribed ? (
                    <Bell className="h-5 w-5 mt-0.5 text-green-500" />
                  ) : (
                    <BellOff className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Notificações Push</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Receba alertas de chamadas e mensagens mesmo com o app fechado
                    </p>
                    {permission === 'denied' && (
                      <p className="text-xs text-red-500 mt-2">
                        Bloqueado pelo navegador. Habilite nas configurações do navegador.
                      </p>
                    )}
                  </div>
                  {permission === 'denied' ? (
                    <BellOff className="h-5 w-5 text-red-500" />
                  ) : (
                    <Button
                      variant={isPushSubscribed ? 'outline' : 'default'}
                      size="sm"
                      disabled={subscribingPush}
                      onClick={async () => {
                        setSubscribingPush(true);
                        try {
                          if (isPushSubscribed) {
                            await unsubscribePush();
                          } else {
                            // Primeiro pedir permissão se ainda não tem
                            if (permission !== 'granted') {
                              await requestPermission();
                            }
                            await subscribePush();
                          }
                        } finally {
                          setSubscribingPush(false);
                        }
                      }}
                    >
                      {subscribingPush
                        ? 'Aguarde...'
                        : isPushSubscribed
                        ? 'Desativar'
                        : 'Ativar'}
                    </Button>
                  )}
                </div>

                {/* Som de Notificação */}
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  {soundEnabled ? (
                    <Volume2 className="h-5 w-5 mt-0.5 text-primary" />
                  ) : (
                    <VolumeX className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  )}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">Som de notificação</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tocar som ao receber novas mensagens
                    </p>
                  </div>
                  <Switch
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                </div>

                {/* Botões de Teste */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testNotification}
                    disabled={permission !== 'granted'}
                  >
                    Testar notificação
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testSound}
                    disabled={!soundEnabled}
                  >
                    Testar som
                  </Button>
                </div>

                <div className="border-t my-4" />

                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Segurança
                </h3>
              </>
            )}

            {/* Status E2EE */}
            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
              <Key className="h-5 w-5 mt-0.5 text-primary" />
              <div className="flex-1">
                <h4 className="text-sm font-medium">Criptografia E2EE</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Suas mensagens são criptografadas de ponta a ponta.
                  Apenas você e o destinatário podem ler.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <span className="font-medium">{sessionCount}</span> sessões ativas
                </p>
              </div>
              <Check className="h-5 w-5 text-green-500" />
            </div>

            {/* Reset E2EE */}
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <RefreshCw className="h-5 w-5 mt-0.5 text-orange-500" />
              <div className="flex-1">
                <h4 className="text-sm font-medium">Resetar Criptografia</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Use se estiver tendo problemas para enviar ou receber mensagens.
                  Isso irá gerar novas chaves de criptografia.
                </p>
                <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Mensagens antigas podem ficar ilegíveis
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmResetOpen(true)}
                disabled={resetSuccess}
              >
                {resetSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Resetado
                  </>
                ) : (
                  'Resetar'
                )}
              </Button>
            </div>

            {/* Info sobre problemas */}
            {resetSuccess && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Criptografia resetada com sucesso! A página será recarregada...
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Reset Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Resetar Criptografia E2EE?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta ação irá:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Gerar novas chaves de criptografia</li>
                <li>Criar novas sessões com seus contatos</li>
                <li>Recarregar a página automaticamente</li>
              </ul>
              <p className="text-orange-500 font-medium mt-3">
                Atenção: Mensagens antigas criptografadas com as chaves anteriores
                não poderão ser lidas.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetE2EE}
              disabled={resetting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {resetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Resetando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Confirmar Reset
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
