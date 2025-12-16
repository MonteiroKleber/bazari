import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PostDraft } from '@/hooks/useDraftPost';

interface DraftRecoveryDialogProps {
  open: boolean;
  draft: PostDraft | null;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  open,
  draft,
  onRecover,
  onDiscard,
}: DraftRecoveryDialogProps) {
  if (!draft) return null;

  const timeAgo = formatDistanceToNow(new Date(draft.savedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  // Truncate content preview
  const previewContent =
    draft.content.length > 100
      ? draft.content.slice(0, 100) + '...'
      : draft.content;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rascunho encontrado
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Você tem um rascunho não publicado salvo {timeAgo}.</p>
              <div className="p-3 bg-muted rounded-md text-sm text-foreground">
                {previewContent}
              </div>
              {draft.kind === 'poll' && draft.pollOptions && (
                <p className="text-xs text-muted-foreground">
                  Inclui enquete com {draft.pollOptions.filter(Boolean).length} opções
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Descartar</AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>Recuperar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
