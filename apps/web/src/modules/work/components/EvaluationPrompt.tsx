// path: apps/web/src/modules/work/components/EvaluationPrompt.tsx
// Prompt para convidar usuário a avaliar após encerramento

import { Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle2, Clock } from 'lucide-react';

interface EvaluationPromptProps {
  agreementId: string;
  counterpartyName: string;
  hasEvaluated: boolean;
  otherPartyEvaluated: boolean;
  isPublic: boolean;
}

export function EvaluationPrompt({
  agreementId,
  counterpartyName,
  hasEvaluated,
  otherPartyEvaluated,
  isPublic,
}: EvaluationPromptProps) {
  // Já avaliou e está público
  if (hasEvaluated && isPublic) {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertTitle>Avaliações publicadas</AlertTitle>
        <AlertDescription>
          Ambas as avaliações foram publicadas. Obrigado pelo feedback!
        </AlertDescription>
      </Alert>
    );
  }

  // Já avaliou mas aguardando outra parte
  if (hasEvaluated && !isPublic) {
    return (
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertTitle>Aguardando avaliação</AlertTitle>
        <AlertDescription>
          Sua avaliação foi enviada. Será publicada quando {counterpartyName} também avaliar.
        </AlertDescription>
      </Alert>
    );
  }

  // Ainda não avaliou
  return (
    <Alert>
      <Star className="h-4 w-4" />
      <AlertTitle>Avalie sua experiência</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="flex-1">
          O acordo com {counterpartyName} foi encerrado. Compartilhe sua experiência para ajudar
          outros usuários.
          {otherPartyEvaluated && (
            <span className="text-primary font-medium ml-1">
              A outra parte já avaliou!
            </span>
          )}
        </span>
        <Button size="sm" asChild>
          <Link to={`/app/work/agreements/${agreementId}/evaluate`}>
            <Star className="h-4 w-4 mr-2" />
            Avaliar agora
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default EvaluationPrompt;
