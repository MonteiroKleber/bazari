import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Briefcase, DollarSign, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Opportunity {
  id: string;
  storeId: number;
  title: string;
  description: string;
  type: 'job' | 'freelance' | 'partnership';
  compensation?: string;
  requirements?: Record<string, any>;
  status: 'open' | 'filled' | 'closed';
  expiresAt?: number;
  createdAt: number;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  onApply?: (opportunityId: string) => void;
  isLoading?: boolean;
}

const typeLabels = {
  job: 'Emprego',
  freelance: 'Freelance',
  partnership: 'Parceria',
};

const typeColors = {
  job: 'bg-blue-100 text-blue-800',
  freelance: 'bg-green-100 text-green-800',
  partnership: 'bg-purple-100 text-purple-800',
};

export function OpportunityCard({ opportunity, onApply, isLoading }: OpportunityCardProps) {
  const [applying, setApplying] = useState(false);

  const isExpired = opportunity.expiresAt && opportunity.expiresAt < Date.now();
  const canApply = opportunity.status === 'open' && !isExpired;

  const handleApply = async () => {
    if (!canApply || !onApply) return;

    setApplying(true);
    try {
      await onApply(opportunity.id);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={`border rounded-lg p-4 space-y-3 ${!canApply ? 'opacity-75 bg-muted/50' : 'bg-card'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{opportunity.title}</h3>
          <span className={`inline-block text-xs px-2 py-0.5 rounded mt-1 ${typeColors[opportunity.type]}`}>
            {typeLabels[opportunity.type]}
          </span>
        </div>

        {opportunity.status !== 'open' && (
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
            {opportunity.status === 'filled' ? 'Preenchida' : 'Fechada'}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground line-clamp-3">{opportunity.description}</p>

      {/* Compensation */}
      {opportunity.compensation && (
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-600">{opportunity.compensation}</span>
        </div>
      )}

      {/* Requirements */}
      {opportunity.requirements && Object.keys(opportunity.requirements).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Requisitos:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(opportunity.requirements).slice(0, 3).map(([key, value]) => (
              <span key={key} className="text-xs px-2 py-0.5 rounded bg-muted">
                {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {isExpired ? (
            <span className="text-red-600">Expirada</span>
          ) : opportunity.expiresAt ? (
            <span>Expira em {formatDistanceToNow(new Date(opportunity.expiresAt), { locale: ptBR })}</span>
          ) : (
            <span>Sem prazo</span>
          )}
        </div>

        {canApply && (
          <Button
            onClick={handleApply}
            disabled={isLoading || applying}
            size="sm"
          >
            {applying ? 'Enviando...' : 'Candidatar-se'}
          </Button>
        )}
      </div>
    </div>
  );
}
