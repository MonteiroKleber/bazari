// path: apps/web/src/modules/work/components/EvaluationForm.tsx
// Formulário de avaliação pós-acordo

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { RatingStars } from './RatingStars';
import { submitEvaluation, type EvaluationInput, type CreateEvaluationResponse } from '../api';

interface EvaluationFormProps {
  agreementId: string;
  targetName: string;
  onSuccess?: (response: CreateEvaluationResponse) => void;
}

export function EvaluationForm({ agreementId, targetName, onSuccess }: EvaluationFormProps) {
  const [ratings, setRatings] = useState({
    overall: 0,
    communication: 0,
    punctuality: 0,
    quality: 0,
  });
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: (data: EvaluationInput) => submitEvaluation(agreementId, data),
    onSuccess: (response) => {
      if (response.nowPublic) {
        toast.success('Avaliação enviada! Ambas avaliações estão agora públicas.');
      } else {
        toast.success('Avaliação enviada! Será publicada quando a outra parte também avaliar.');
      }
      onSuccess?.(response);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao enviar avaliação');
    },
  });

  const handleSubmit = () => {
    if (ratings.overall === 0) {
      toast.error('Selecione a avaliação geral');
      return;
    }

    const data: EvaluationInput = {
      overallRating: ratings.overall,
      communicationRating: ratings.communication || undefined,
      punctualityRating: ratings.punctuality || undefined,
      qualityRating: ratings.quality || undefined,
      comment: comment.trim() || undefined,
    };

    mutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliar {targetName}</CardTitle>
        <CardDescription className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          Sua avaliação será pública apenas após ambas as partes avaliarem
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Avaliação Geral */}
        <div className="space-y-2">
          <Label className="text-base font-medium">
            Avaliação Geral <span className="text-destructive">*</span>
          </Label>
          <RatingStars
            value={ratings.overall}
            onChange={(v) => setRatings({ ...ratings, overall: v })}
            size="lg"
          />
          {ratings.overall === 0 && (
            <p className="text-xs text-muted-foreground">Clique nas estrelas para avaliar</p>
          )}
        </div>

        {/* Avaliações Detalhadas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Comunicação</Label>
            <RatingStars
              value={ratings.communication}
              onChange={(v) => setRatings({ ...ratings, communication: v })}
              size="md"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Pontualidade</Label>
            <RatingStars
              value={ratings.punctuality}
              onChange={(v) => setRatings({ ...ratings, punctuality: v })}
              size="md"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Qualidade</Label>
            <RatingStars
              value={ratings.quality}
              onChange={(v) => setRatings({ ...ratings, quality: v })}
              size="md"
            />
          </div>
        </div>

        {/* Comentário */}
        <div className="space-y-2">
          <Label htmlFor="comment">Comentário (opcional)</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Descreva sua experiência trabalhando com esta pessoa..."
            rows={4}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={ratings.overall === 0 || mutation.isPending}
          className="w-full sm:w-auto"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Enviar Avaliação
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default EvaluationForm;
