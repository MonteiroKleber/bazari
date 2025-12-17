import { useTranslation } from 'react-i18next';
import { Lock, CreditCard, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyField } from './CopyField';
import { FileDropzone } from './FileDropzone';
import { RatingStars } from './RatingStars';
import { formatBRL, formatAsset } from '../utils/format';
import { cn } from '@/lib/utils';

type ActionCardVariant =
  | 'escrow'
  | 'payment'
  | 'confirmation'
  | 'completed'
  | 'cancelled'
  | 'waiting';

interface ActionCardProps {
  variant: ActionCardVariant;
  order: {
    id: string;
    amountBZR: string;
    amountBRL: string;
    pixKeySnapshot?: string | null;
    proofUrls?: string[] | null;
    assetType?: 'BZR' | 'ZARI';
  };
  isMyTurn: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  loading?: boolean;
  // For escrow variant
  balance?: string;
  estimatedFee?: string;
  // For payment variant
  onUploadProof?: (file: File) => Promise<string>;
  proofUrl?: string;
  onRemoveProof?: () => void;
  // For completed variant
  rating?: number;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

const variantConfig = {
  escrow: {
    icon: Lock,
    titleKey: 'p2p.action.escrow.title',
    defaultTitle: 'Travar Escrow',
    color: 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20',
  },
  payment: {
    icon: CreditCard,
    titleKey: 'p2p.action.payment.title',
    defaultTitle: 'Pagamento PIX',
    color: 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20',
  },
  confirmation: {
    icon: CheckCircle,
    titleKey: 'p2p.action.confirmation.title',
    defaultTitle: 'Confirmar Recebimento',
    color: 'border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/20',
  },
  completed: {
    icon: CheckCircle,
    titleKey: 'p2p.action.completed.title',
    defaultTitle: 'Negociação Concluída',
    color: 'border-green-500/30 bg-green-50/50 dark:bg-green-950/20',
  },
  cancelled: {
    icon: XCircle,
    titleKey: 'p2p.action.cancelled.title',
    defaultTitle: 'Negociação Cancelada',
    color: 'border-red-500/30 bg-red-50/50 dark:bg-red-950/20',
  },
  waiting: {
    icon: Clock,
    titleKey: 'p2p.action.waiting.title',
    defaultTitle: 'Aguardando',
    color: 'border-muted',
  },
};

export function ActionCard({
  variant,
  order,
  isMyTurn: _isMyTurn,
  onPrimaryAction,
  onSecondaryAction,
  loading = false,
  balance,
  estimatedFee,
  onUploadProof,
  proofUrl,
  onRemoveProof,
  rating = 5,
  onRatingChange,
  className,
}: ActionCardProps) {
  // isMyTurn is available for future use in conditional rendering
  void _isMyTurn;
  const { t } = useTranslation();
  const config = variantConfig[variant];
  const Icon = config.icon;
  const assetType = order.assetType || 'BZR';

  return (
    <Card className={cn('border-2', config.color, className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {t(config.titleKey, config.defaultTitle)}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ESCROW VARIANT */}
        {variant === 'escrow' && (
          <>
            <p className="text-sm text-muted-foreground">
              {t('p2p.action.escrow.description', 'Você precisa travar {{amount}} {{asset}} para iniciar a negociação.', {
                amount: formatAsset(order.amountBZR),
                asset: assetType,
              })}
            </p>

            <div className="space-y-2 text-sm">
              {balance && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('p2p.action.escrow.balance', 'Saldo disponível')}:
                  </span>
                  <span className="font-mono">{formatAsset(balance)} {assetType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {t('p2p.action.escrow.amount', 'Valor a travar')}:
                </span>
                <span className="font-mono">{formatAsset(order.amountBZR)} {assetType}</span>
              </div>
              {estimatedFee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('p2p.action.escrow.fee', 'Taxa estimada')}:
                  </span>
                  <span className="font-mono">{formatAsset(estimatedFee)} {assetType}</span>
                </div>
              )}
            </div>

            <Button
              onClick={onPrimaryAction}
              disabled={loading}
              className="w-full"
            >
              {loading
                ? t('common.loading', 'Carregando...')
                : t('p2p.action.escrow.button', 'Travar {{asset}} no Escrow', { asset: assetType })}
            </Button>
          </>
        )}

        {/* PAYMENT VARIANT */}
        {variant === 'payment' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <CopyField
                label={t('p2p.action.payment.pixKey', 'Chave PIX')}
                value={order.pixKeySnapshot || '—'}
              />
              <CopyField
                label={t('p2p.action.payment.amount', 'Valor')}
                value={formatBRL(order.amountBRL)}
              />
            </div>

            {onUploadProof && (
              <FileDropzone
                onUpload={onUploadProof}
                value={proofUrl}
                onRemove={onRemoveProof}
              />
            )}

            <Button
              onClick={onPrimaryAction}
              disabled={loading || (!proofUrl && !order.proofUrls?.length)}
              className="w-full"
            >
              {loading
                ? t('common.loading', 'Carregando...')
                : t('p2p.action.payment.button', 'Já paguei - Marcar como pago')}
            </Button>

            {!proofUrl && !order.proofUrls?.length && (
              <p className="text-xs text-muted-foreground text-center">
                {t('p2p.action.payment.needProof', 'Anexe o comprovante para continuar')}
              </p>
            )}
          </>
        )}

        {/* CONFIRMATION VARIANT */}
        {variant === 'confirmation' && (
          <>
            <p className="text-sm text-muted-foreground">
              {t('p2p.action.confirmation.description', 'O comprador marcou o pagamento como enviado.')}
            </p>

            {order.proofUrls && order.proofUrls.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {t('p2p.action.confirmation.proofs', 'Comprovantes anexados')}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {order.proofUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-20 h-20 rounded border overflow-hidden hover:opacity-80"
                    >
                      <img
                        src={url}
                        alt={`Comprovante ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              {t('p2p.action.confirmation.warning', 'Ao confirmar, {{amount}} {{asset}} serão liberados para o comprador.', {
                amount: formatAsset(order.amountBZR),
                asset: assetType,
              })}
            </p>

            <div className="flex gap-2">
              {onSecondaryAction && (
                <Button
                  variant="outline"
                  onClick={onSecondaryAction}
                  disabled={loading}
                  className="flex-1"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {t('p2p.action.confirmation.dispute', 'Abrir disputa')}
                </Button>
              )}
              <Button
                onClick={onPrimaryAction}
                disabled={loading}
                className="flex-1"
              >
                {loading
                  ? t('common.loading', 'Carregando...')
                  : t('p2p.action.confirmation.button', 'Confirmar recebimento')}
              </Button>
            </div>
          </>
        )}

        {/* COMPLETED VARIANT */}
        {variant === 'completed' && (
          <>
            <p className="text-sm text-center">
              {t('p2p.action.completed.description', 'A negociação foi concluída com sucesso!')}
            </p>

            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-2">
                {t('p2p.action.completed.rate', 'Avalie sua experiência')}:
              </p>
              <div className="flex justify-center">
                <RatingStars
                  value={rating}
                  onChange={onRatingChange}
                  readonly={!onRatingChange}
                  size="lg"
                />
              </div>
            </div>

            {onRatingChange && (
              <Button onClick={onPrimaryAction} disabled={loading} className="w-full">
                {loading
                  ? t('common.loading', 'Carregando...')
                  : t('p2p.action.completed.button', 'Enviar avaliação')}
              </Button>
            )}
          </>
        )}

        {/* CANCELLED VARIANT */}
        {variant === 'cancelled' && (
          <p className="text-sm text-center text-muted-foreground">
            {t('p2p.action.cancelled.description', 'Esta negociação foi cancelada ou expirou.')}
          </p>
        )}

        {/* WAITING VARIANT */}
        {variant === 'waiting' && (
          <>
            <div className="flex items-center justify-center py-4">
              <Clock className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {t('p2p.action.waiting.description', 'Aguardando a contraparte realizar a próxima ação.')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
