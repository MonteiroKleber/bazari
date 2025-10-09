// apps/web/src/components/social/CommentSection.tsx

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Author {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  replies?: Comment[];
  parentId?: string | null;
}

interface CommentSectionProps {
  postId: string;
}

function CommentItem({ comment }: { comment: Comment }) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {comment.author.avatarUrl ? (
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.author.displayName}</span>
            <span className="text-xs text-muted-foreground">@{comment.author.handle}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        </div>
      </div>

      {/* Respostas com indentação */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {reply.author.avatarUrl ? (
                  <img
                    src={reply.author.avatarUrl}
                    alt={reply.author.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{reply.author.displayName}</span>
                  <span className="text-xs text-muted-foreground">@{reply.author.handle}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.createdAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response: any = await apiHelpers.getPostComments(postId);
      setComments(response.items || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Erro ao carregar comentários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    if (content.length > 1000) {
      toast.error('Comentário muito longo (máx 1000 caracteres)');
      return;
    }

    setSubmitting(true);
    try {
      const response: any = await apiHelpers.createPostComment(postId, {
        content: content.trim(),
      });

      // Adicionar novo comentário no topo
      setComments([response.comment, ...comments]);
      setContent('');
      toast.success('Comentário publicado!');
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Erro ao publicar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulário de comentário */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {content.length}/1000
          </span>
          <Button type="submit" disabled={submitting || !content.trim()} size="sm">
            {submitting ? 'Publicando...' : 'Comentar'}
          </Button>
        </div>
      </form>

      {/* Lista de comentários */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Seja o primeiro a comentar!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
