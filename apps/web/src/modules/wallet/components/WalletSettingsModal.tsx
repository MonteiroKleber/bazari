import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Coins, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TokenSettings } from './TokenSettings';
import { AccountsSettings } from './AccountsSettings';

interface WalletSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'tokens' | 'accounts';

export function WalletSettingsModal({ open, onOpenChange }: WalletSettingsModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('tokens');

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: 'tokens',
      label: t('wallet.settings.tabs.tokens', { defaultValue: 'Tokens' }),
      icon: <Coins className="h-4 w-4" />,
    },
    {
      id: 'accounts',
      label: t('wallet.settings.tabs.accounts', { defaultValue: 'Contas' }),
      icon: <Users className="h-4 w-4" />,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('wallet.settings.title', { defaultValue: 'Configuracoes da Carteira' })}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'tokens' && <TokenSettings />}
          {activeTab === 'accounts' && (
            <AccountsSettings onClose={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
