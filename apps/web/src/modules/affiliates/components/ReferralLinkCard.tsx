import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Link,
  Copy,
  Check,
  Share2,
  QrCode,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useGenerateReferralLink,
  copyToClipboard,
  type GeneratedReferralLink,
} from '@/hooks/blockchain/useAffiliate';

interface ReferralLinkCardProps {
  referralCode?: string;
  existingLink?: string;
  className?: string;
}

export function ReferralLinkCard({
  referralCode,
  existingLink,
  className = '',
}: ReferralLinkCardProps) {
  const [generatedLink, setGeneratedLink] = useState<GeneratedReferralLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [targetUrl, setTargetUrl] = useState('');
  const [campaign, setCampaign] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);

  const { generateLink, isLoading, error } = useGenerateReferralLink();

  const currentLink = generatedLink?.fullUrl || existingLink;
  const currentCode = generatedLink?.referralCode || referralCode;

  const handleGenerateLink = async () => {
    try {
      const result = await generateLink({
        targetUrl: targetUrl || undefined,
        campaign: campaign || undefined,
      });
      setGeneratedLink(result);
      toast.success('Link de referral gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar link de referral');
    }
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Erro ao copiar');
    }
  };

  const handleShare = async () => {
    if (!currentLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Junte-se ao Bazari!',
          text: 'Use meu link de referral para ganhar recompensas!',
          url: currentLink,
        });
      } catch (err) {
        handleCopy(currentLink);
      }
    } else {
      handleCopy(currentLink);
    }
  };

  const generateQrCodeUrl = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5" />
          Link de Referral
        </CardTitle>
        <CardDescription>
          Compartilhe seu link e ganhe comissoes em todas as vendas dos seus indicados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentLink ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input value={currentLink} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={() => handleCopy(currentLink)}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {currentCode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Codigo:</span>
                <Badge variant="secondary" className="font-mono">{currentCode}</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>

              <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <QrCode className="w-4 h-4 mr-2" />
                    QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>QR Code do seu Link</DialogTitle>
                    <DialogDescription>Escaneie para acessar seu link de referral</DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <img
                      src={generateQrCodeUrl(currentLink)}
                      alt="QR Code"
                      className="rounded-lg border"
                      width={200}
                      height={200}
                    />
                    <p className="text-sm text-muted-foreground text-center font-mono">{currentCode}</p>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" size="sm" onClick={() => window.open(currentLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Link className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Gere seu link de referral para comecar a ganhar</p>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
          >
            Opcoes Avancadas
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-3 mt-3">
              <div>
                <Label htmlFor="targetUrl">URL de Destino (opcional)</Label>
                <Input
                  id="targetUrl"
                  placeholder="https://bazari.io/produto/..."
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Redireciona para uma pagina especifica
                </p>
              </div>
              <div>
                <Label htmlFor="campaign">Campanha (opcional)</Label>
                <Input
                  id="campaign"
                  placeholder="blackfriday, lancamento, etc"
                  value={campaign}
                  onChange={(e) => setCampaign(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Identifica a origem do trafego
                </p>
              </div>
            </div>
          )}
        </div>

        <Button className="w-full" onClick={handleGenerateLink} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Gerando...
            </>
          ) : currentLink ? (
            <>
              <Link className="w-4 h-4 mr-2" />
              Gerar Novo Link
            </>
          ) : (
            <>
              <Link className="w-4 h-4 mr-2" />
              Gerar Link de Referral
            </>
          )}
        </Button>

        {error && <p className="text-sm text-destructive text-center">{error.message}</p>}

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">Dicas para aumentar suas conversoes:</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Compartilhe em suas redes sociais</li>
            <li>Use links diretos para produtos especificos</li>
            <li>Adicione campanhas para rastrear origens</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
