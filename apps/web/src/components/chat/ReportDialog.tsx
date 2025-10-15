import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { apiHelpers } from '../../lib/api';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedId: string;
  contentType: 'message' | 'profile' | 'group';
  contentId: string;
  onReportSubmitted?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou conteúdo repetitivo' },
  { value: 'harassment', label: 'Assédio ou bullying' },
  { value: 'hate_speech', label: 'Discurso de ódio' },
  { value: 'violence', label: 'Violência ou ameaças' },
  { value: 'scam', label: 'Fraude ou golpe' },
  { value: 'inappropriate', label: 'Conteúdo inadequado' },
  { value: 'impersonation', label: 'Personificação' },
  { value: 'other', label: 'Outro' },
];

export function ReportDialog({
  open,
  onOpenChange,
  reportedId,
  contentType,
  contentId,
  onReportSubmitted,
}: ReportDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Por favor, selecione um motivo');
      return;
    }

    if (description.length < 10) {
      setError('Por favor, forneça mais detalhes (mínimo 10 caracteres)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await apiHelpers.createReport({
        reportedId,
        contentType,
        contentId,
        reason,
        description,
      });

      // Reset form
      setReason('');
      setDescription('');
      onOpenChange(false);

      if (onReportSubmitted) {
        onReportSubmitted();
      }
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError('Falha ao enviar denúncia. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Denunciar Conteúdo</DialogTitle>
          <DialogDescription>
            Ajude-nos a manter a comunidade segura. Todas as denúncias são analisadas pela
            comunidade através de votação ponderada por reputação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Motivo da denúncia</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detalhes adicionais</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema em detalhes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 caracteres
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <strong>Como funciona:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Sua denúncia é enviada para análise da comunidade</li>
              <li>Usuários com alta reputação podem votar (aprovar/rejeitar)</li>
              <li>Votos são ponderados pela reputação do votante</li>
              <li>Após 20 votos, a decisão é automaticamente aplicada</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason || description.length < 10}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Denúncia'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
