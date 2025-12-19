// path: apps/web/src/modules/work/components/ApplicationModal.tsx
// Modal para candidatar-se a uma vaga

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { applyToJob } from '../api';

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
}

export function ApplicationModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
}: ApplicationModalProps) {
  const queryClient = useQueryClient();
  const [coverLetter, setCoverLetter] = useState('');
  const [expectedValue, setExpectedValue] = useState('');

  const applyMutation = useMutation({
    mutationFn: () =>
      applyToJob(jobId, {
        coverLetter: coverLetter || undefined,
        expectedValue: expectedValue ? Number(expectedValue) : undefined,
      }),
    onSuccess: (data) => {
      toast.success(data.message || 'Candidatura enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['job-public', jobId] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      onOpenChange(false);
      setCoverLetter('');
      setExpectedValue('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erro ao enviar candidatura');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Candidatar-se</DialogTitle>
            <DialogDescription>
              Envie sua candidatura para a vaga de <strong>{jobTitle}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cover Letter */}
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Carta de Apresentação (opcional)</Label>
              <Textarea
                id="coverLetter"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Conte um pouco sobre você e por que você é a pessoa certa para esta vaga..."
                rows={5}
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {coverLetter.length}/5000
              </p>
            </div>

            {/* Expected Value */}
            <div className="space-y-2">
              <Label htmlFor="expectedValue">Pretensão Salarial (opcional)</Label>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  id="expectedValue"
                  type="number"
                  value={expectedValue}
                  onChange={(e) => setExpectedValue(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max="1000000"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Informe o valor que você espera receber (mensal ou por projeto)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={applyMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={applyMutation.isPending}>
              {applyMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Candidatura
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default ApplicationModal;
