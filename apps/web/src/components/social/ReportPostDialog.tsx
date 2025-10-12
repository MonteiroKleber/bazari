// apps/web/src/components/social/ReportPostDialog.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';

interface ReportPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou propaganda não solicitada' },
  { value: 'harassment', label: 'Assédio ou bullying' },
  { value: 'inappropriate', label: 'Conteúdo inapropriado ou ofensivo' },
  { value: 'misleading', label: 'Informação falsa ou enganosa' },
  { value: 'copyright', label: 'Violação de direitos autorais' },
  { value: 'other', label: 'Outro motivo' },
];

export function ReportPostDialog({ open, onOpenChange, postId }: ReportPostDialogProps) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Selecione um motivo');
      return;
    }

    setSubmitting(true);
    try {
      await apiHelpers.reportPost(postId, {
        reason,
        details: details.trim() || undefined,
      });

      toast.success('Post reportado com sucesso. Obrigado pelo feedback!');
      onOpenChange(false);

      // Reset form
      setReason('');
      setDetails('');
    } catch (error: any) {
      console.error('Error reporting post:', error);
      toast.error(error?.message || 'Erro ao reportar post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar Post</DialogTitle>
          <DialogDescription>
            Por que você está reportando este post? Sua denúncia será revisada pela equipe de moderação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Motivo do report</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Detalhes adicionais (opcional)</Label>
            <Textarea
              id="details"
              placeholder="Forneça mais informações sobre o problema..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {details.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? 'Enviando...' : 'Enviar Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
