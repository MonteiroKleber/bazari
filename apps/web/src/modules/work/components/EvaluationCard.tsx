// path: apps/web/src/modules/work/components/EvaluationCard.tsx
// Card de exibição de uma avaliação

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RatingStars } from './RatingStars';
import type { WorkEvaluation } from '../api';

interface EvaluationCardProps {
  evaluation: WorkEvaluation;
  showAuthor?: boolean;
  showTarget?: boolean;
  showAgreement?: boolean;
}

export function EvaluationCard({
  evaluation,
  showAuthor = true,
  showTarget = false,
  showAgreement = true,
}: EvaluationCardProps) {
  const person = showTarget ? evaluation.target : evaluation.author;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header com pessoa e rating */}
          <div className="flex items-start justify-between gap-3">
            {person && (
              <Link
                to={`/app/profile/${person.handle}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={person.avatarUrl || undefined} />
                  <AvatarFallback>{person.displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{person.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{person.handle}</p>
                </div>
              </Link>
            )}

            <div className="flex flex-col items-end gap-1">
              <RatingStars value={evaluation.overallRating} readonly size="sm" showValue />
              {!evaluation.isPublic && (
                <Badge variant="secondary" className="text-xs">
                  Aguardando publicação
                </Badge>
              )}
            </div>
          </div>

          {/* Ratings detalhados */}
          {(evaluation.communicationRating ||
            evaluation.punctualityRating ||
            evaluation.qualityRating) && (
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {evaluation.communicationRating && (
                <span className="flex items-center gap-1">
                  Comunicação:{' '}
                  <RatingStars value={evaluation.communicationRating} readonly size="sm" />
                </span>
              )}
              {evaluation.punctualityRating && (
                <span className="flex items-center gap-1">
                  Pontualidade:{' '}
                  <RatingStars value={evaluation.punctualityRating} readonly size="sm" />
                </span>
              )}
              {evaluation.qualityRating && (
                <span className="flex items-center gap-1">
                  Qualidade: <RatingStars value={evaluation.qualityRating} readonly size="sm" />
                </span>
              )}
            </div>
          )}

          {/* Comentário */}
          {evaluation.comment && (
            <div className="flex gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground italic">"{evaluation.comment}"</p>
            </div>
          )}

          {/* Footer com acordo e data */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            {showAgreement && evaluation.agreement && (
              <Link
                to={`/app/work/agreements/${evaluation.agreement.id}`}
                className="flex items-center gap-1 hover:underline"
              >
                <Briefcase className="h-3 w-3" />
                {evaluation.agreement.title}
              </Link>
            )}

            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(evaluation.createdAt), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EvaluationCard;
