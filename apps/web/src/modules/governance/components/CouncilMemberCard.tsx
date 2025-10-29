import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, ExternalLink, Shield } from 'lucide-react';
import { formatAddress } from '@/lib/utils';

interface CouncilMemberCardProps {
  address: string;
  backing?: string;
  isTechnical?: boolean;
  onClick?: () => void;
}

export function CouncilMemberCard({
  address,
  backing,
  isTechnical = false,
  onClick,
}: CouncilMemberCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:border-primary transition-colors ${
        isTechnical ? 'border-purple-200 bg-purple-50/20' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isTechnical
                ? 'bg-purple-500/10 text-purple-600'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {isTechnical ? (
              <Shield className="h-6 w-6" />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-sm truncate">
                {formatAddress(address, 8)}
              </h3>
              {isTechnical && (
                <Badge className="bg-purple-500/10 text-purple-700 border-purple-300 text-xs">
                  Técnico
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground font-mono break-all mb-3">
              {address}
            </p>

            {backing && (
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium">Backing:</span> {backing} BZR
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://polkadot.js.org/apps/?rpc=ws://localhost:9944#/accounts/${address}`, '_blank');
              }}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Ver no Explorer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
