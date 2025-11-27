import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, Image, File, AlertCircle, Copy, Check } from 'lucide-react';

interface EvidenceViewerProps {
  evidenceCid: string;
}

// IPFS gateway URLs
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

export function EvidenceViewer({ evidenceCid }: EvidenceViewerProps) {
  const [copied, setCopied] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(0);

  if (!evidenceCid || evidenceCid.trim() === '') {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma evidencia anexada</p>
      </div>
    );
  }

  const ipfsUrl = `${IPFS_GATEWAYS[selectedGateway]}${evidenceCid}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(evidenceCid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(ipfsUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTryNextGateway = () => {
    setSelectedGateway((prev) => (prev + 1) % IPFS_GATEWAYS.length);
  };

  return (
    <div className="space-y-4">
      {/* CID Display */}
      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Badge variant="outline" className="flex-shrink-0">
          IPFS CID
        </Badge>
        <code className="text-sm font-mono truncate flex-1" title={evidenceCid}>
          {evidenceCid}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="flex-shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Preview attempt */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-video bg-muted flex items-center justify-center">
            {/* Try to load as image */}
            <img
              src={ipfsUrl}
              alt="Evidence"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                // Hide image on error, show placeholder
                (e.target as HTMLImageElement).style.display = 'none';
                const placeholder = document.getElementById('evidence-placeholder');
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />
            {/* Placeholder if image fails */}
            <div
              id="evidence-placeholder"
              className="absolute inset-0 hidden flex-col items-center justify-center bg-muted"
            >
              <File className="w-16 h-16 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                Visualizacao nao disponivel
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Abra o link para ver o conteudo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleOpenInNewTab} className="flex-1">
          <ExternalLink className="w-4 h-4 mr-2" />
          Abrir no IPFS
        </Button>
        <Button variant="outline" onClick={handleTryNextGateway}>
          Trocar Gateway
        </Button>
      </div>

      {/* Gateway info */}
      <p className="text-xs text-muted-foreground text-center">
        Gateway: {IPFS_GATEWAYS[selectedGateway].replace('https://', '').replace('/ipfs/', '')}
      </p>
    </div>
  );
}
