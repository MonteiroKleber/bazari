// apps/web/src/components/social/PostOptionsMenu.tsx

import { useState } from 'react';
import { MoreHorizontal, Trash2, Edit, Flag, Link2, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { EditPostModal } from './EditPostModal';
import { ReportPostDialog } from './ReportPostDialog';

interface PostOptionsMenuProps {
  postId: string;
  authorHandle: string;
  currentUserHandle?: string; // Handle do usuário logado (se disponível)
  onDeleted?: () => void; // Callback quando post for deletado
  post?: {
    id: string;
    content: string;
    media?: Array<{ url: string; type: string }>;
    isPinned?: boolean;
  };
  onUpdated?: (updatedPost: any) => void;
  onPinned?: (pinned: boolean) => void;
}

export function PostOptionsMenu({
  postId,
  authorHandle,
  currentUserHandle,
  onDeleted,
  post,
  onUpdated,
  onPinned,
}: PostOptionsMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const isAuthor = currentUserHandle && currentUserHandle === authorHandle;

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(postUrl);
    toast.success('Link copiado!');
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiHelpers.deletePost(postId);
      toast.success('Post deletado com sucesso');
      setDeleteDialogOpen(false);
      onDeleted?.();
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error(error?.message || 'Erro ao deletar post');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    setEditModalOpen(true);
  };

  const handleTogglePin = async () => {
    const isPinned = post?.isPinned || false;

    try {
      if (isPinned) {
        await apiHelpers.unpinPost(postId);
        toast.success('Post desfixado');
      } else {
        await apiHelpers.pinPost(postId);
        toast.success('Post fixado no perfil');
      }

      onPinned?.(!isPinned);
    } catch (error: any) {
      console.error('Error toggling pin:', error);
      toast.error(error?.message || 'Erro ao fixar post');
    }
  };

  const handleReport = () => {
    setReportDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* Copiar Link - disponível para todos */}
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2 h-4 w-4" />
            Copiar link
          </DropdownMenuItem>

          {isAuthor ? (
            <>
              <DropdownMenuSeparator />
              {/* Opções do autor */}
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar post
              </DropdownMenuItem>

              <DropdownMenuItem onClick={handleTogglePin}>
                {post?.isPinned ? (
                  <>
                    <PinOff className="mr-2 h-4 w-4" />
                    Desfixar do perfil
                  </>
                ) : (
                  <>
                    <Pin className="mr-2 h-4 w-4" />
                    Fixar no perfil
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar post
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuSeparator />
              {/* Opções para não-autores */}
              <DropdownMenuItem
                onClick={handleReport}
                className="text-destructive focus:text-destructive"
              >
                <Flag className="mr-2 h-4 w-4" />
                Reportar post
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de Confirmação de Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar post?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O post será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Report */}
      <ReportPostDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        postId={postId}
      />

      {/* Modal de Edição */}
      {isAuthor && post && (
        <EditPostModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          post={post}
          onUpdated={(updatedPost) => {
            onUpdated?.(updatedPost);
            setEditModalOpen(false);
          }}
        />
      )}
    </>
  );
}
