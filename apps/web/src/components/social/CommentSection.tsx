// apps/web/src/components/social/CommentSection.tsx

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Reply, Loader2, Edit2, Trash2, MessageCircle } from 'lucide-react';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CommentSkeleton } from './CommentSkeleton';
import { SkeletonList } from '../SkeletonList';
import { CommentLikeButton } from './CommentLikeButton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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

interface Author {
  handle: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  author: Author;
  replies?: Comment[];
  repliesCount?: number;
  likesCount?: number;
  isLiked?: boolean;
  parentId?: string | null;
}

interface CommentSectionProps {
  postId: string;
}

interface CommentItemProps {
  comment: Comment;
  postId: string;
  replyingTo: string | null;
  replyContent: string;
  onReply: (commentId: string, handle: string) => void;
  onCancelReply: () => void;
  onReplyContentChange: (content: string) => void;
  onSubmitReply: (e: React.FormEvent, parentId: string) => void;
  submitting: boolean;
  onLoadMoreReplies: (commentId: string) => void;
  loadingReplies: Map<string, boolean>;
  currentUserHandle: string | null;
  editingCommentId: string | null;
  editContent: string;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onSaveEdit: (commentId: string, isReply: boolean, parentId?: string) => void;
  onDeleteComment: (commentId: string) => void;
  postAuthorHandle?: string | null;
}

function CommentItem({
  comment,
  postId,
  replyingTo,
  replyContent,
  onReply,
  onCancelReply,
  onReplyContentChange,
  onSubmitReply,
  submitting,
  onLoadMoreReplies,
  loadingReplies,
  currentUserHandle,
  editingCommentId,
  editContent,
  onStartEdit,
  onCancelEdit,
  onEditContentChange,
  onSaveEdit,
  onDeleteComment,
  postAuthorHandle,
}: CommentItemProps) {
  const timeAgo = formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className={cn(
      "space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
      currentUserHandle === comment.author.handle && "bg-primary/5 p-3 rounded-lg"
    )}>
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-sm">{comment.author.displayName}</span>
            <Link
              to={`/u/${comment.author.handle}`}
              className="text-xs text-muted-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              @{comment.author.handle}
            </Link>
            {comment.author.handle === postAuthorHandle && (
              <Badge variant="secondary" className="text-xs h-4 px-1">
                OP
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">•</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-help">
                    {timeAgo}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{new Date(comment.createdAt).toLocaleString('pt-BR')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {editingCommentId === comment.id ? (
            // Modo edição
            <div className="mt-2 space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                maxLength={1000}
                rows={3}
                className="resize-none text-sm"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs tabular-nums",
                  editContent.length > 900 ? "text-destructive font-medium" :
                  editContent.length > 800 ? "text-orange-500" :
                  "text-muted-foreground"
                )}>
                  {editContent.length}/1000
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEdit}
                    disabled={submitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSaveEdit(comment.id, false)}
                    disabled={submitting || !editContent.trim()}
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Modo visualização
            <>
              <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
              {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-muted-foreground italic ml-2">(editado)</span>
              )}

              {/* Botões de like e responder */}
              <div className="flex items-center gap-2 mt-2">
                <CommentLikeButton
                  postId={postId}
                  commentId={comment.id}
                  initialLiked={comment.isLiked || false}
                  initialCount={comment.likesCount || 0}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReply(comment.id, comment.author.handle)}
                  className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Responder
                </Button>

                {currentUserHandle === comment.author.handle && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStartEdit(comment)}
                      className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteComment(comment.id)}
                      className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Formulário de resposta inline */}
      {replyingTo === comment.id && (
        <form onSubmit={(e) => onSubmitReply(e, comment.id)} className="mt-3 ml-11 space-y-2">
          <Textarea
            id={`reply-input-${comment.id}`}
            placeholder={`@${comment.author.handle}...`}
            value={replyContent}
            onChange={(e) => onReplyContentChange(e.target.value)}
            maxLength={1000}
            rows={2}
            className="resize-none"
            autoFocus
            disabled={submitting}
          />
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-xs tabular-nums",
              replyContent.length > 900 ? "text-destructive font-medium" :
              replyContent.length > 800 ? "text-orange-500" :
              "text-muted-foreground"
            )}>
              {replyContent.length}/1000
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancelReply}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting || !replyContent.trim()}
                size="sm"
              >
                {submitting ? 'Respondendo...' : 'Responder'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Respostas com indentação */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className={cn(
              "space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              currentUserHandle === reply.author.handle && "bg-primary/5 p-3 rounded-lg"
            )}>
              <div className="flex gap-3">
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm">{reply.author.displayName}</span>
                    <Link
                      to={`/u/${reply.author.handle}`}
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      @{reply.author.handle}
                    </Link>
                    {reply.author.handle === postAuthorHandle && (
                      <Badge variant="secondary" className="text-xs h-4 px-1">
                        OP
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">•</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground cursor-help">
                            {formatDistanceToNow(new Date(reply.createdAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{new Date(reply.createdAt).toLocaleString('pt-BR')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {editingCommentId === reply.id ? (
                    // Modo edição
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => onEditContentChange(e.target.value)}
                        maxLength={1000}
                        rows={3}
                        className="resize-none text-sm"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs tabular-nums",
                          editContent.length > 900 ? "text-destructive font-medium" :
                          editContent.length > 800 ? "text-orange-500" :
                          "text-muted-foreground"
                        )}>
                          {editContent.length}/1000
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onCancelEdit}
                            disabled={submitting}
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => onSaveEdit(reply.id, true, comment.id)}
                            disabled={submitting || !editContent.trim()}
                          >
                            {submitting ? 'Salvando...' : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Modo visualização
                    <>
                      <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                      {reply.updatedAt && reply.updatedAt !== reply.createdAt && (
                        <span className="text-xs text-muted-foreground italic ml-2">(editado)</span>
                      )}

                      {/* Botões de like e responder para respostas */}
                      <div className="flex items-center gap-2 mt-2">
                        <CommentLikeButton
                          postId={postId}
                          commentId={reply.id}
                          initialLiked={reply.isLiked || false}
                          initialCount={reply.likesCount || 0}
                        />

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onReply(comment.id, reply.author.handle)}
                          className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          Responder
                        </Button>

                        {currentUserHandle === reply.author.handle && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onStartEdit(reply)}
                              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteComment(reply.id)}
                              className="h-auto py-1 px-2 text-xs text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Botão para carregar mais respostas */}
          {comment.repliesCount && comment.repliesCount > (comment.replies?.length || 0) && (
            <div className="mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLoadMoreReplies(comment.id)}
                disabled={loadingReplies.get(comment.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {loadingReplies.get(comment.id) ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>Ver mais {comment.repliesCount - (comment.replies?.length || 0)} resposta(s)</>
                )}
              </Button>
            </div>
          )}
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

  // Estado para gerenciar respostas
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Estado para paginação
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Estado para paginação de respostas
  const [repliesCursors, setRepliesCursors] = useState<Map<string, string | null>>(new Map());
  const [loadingReplies, setLoadingReplies] = useState<Map<string, boolean>>(new Map());

  // Estado para edição
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);

  // Estado para exclusão
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Estado para identificar o autor do post
  const [postAuthorHandle, setPostAuthorHandle] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [postId]);

  // Buscar autor do post
  useEffect(() => {
    (async () => {
      try {
        const response: any = await apiHelpers.getPostById(postId);
        setPostAuthorHandle(response.post?.author?.handle || null);
      } catch (error) {
        // Silently fail - not critical
      }
    })();
  }, [postId]);

  // Buscar usuário atual
  useEffect(() => {
    (async () => {
      try {
        const res: any = await apiHelpers.getMeProfile();
        setCurrentUserHandle(res.profile?.handle || null);
      } catch {}
    })();
  }, []);

  const loadComments = async (cursor?: string | null) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = cursor ? { cursor, limit: 10 } : { limit: 10 };
      const response: any = await apiHelpers.getPostComments(postId, params);

      // Append se tiver cursor, replace se for inicial
      setComments(prev => cursor ? [...prev, ...response.items] : response.items);
      setNextCursor(response.page?.nextCursor || null);
      setHasMore(response.page?.hasMore || false);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Erro ao carregar comentários');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();

    const contentToSubmit = parentId ? replyContent : content;

    if (!contentToSubmit.trim()) {
      toast.error('Digite um comentário');
      return;
    }

    if (contentToSubmit.length > 1000) {
      toast.error('Comentário muito longo (máx 1000 caracteres)');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        content: contentToSubmit.trim(),
      };

      if (parentId) {
        payload.parentId = parentId;
      }

      const response: any = await apiHelpers.createPostComment(postId, payload);

      if (parentId) {
        // Atualizar lista de comentários para incluir a nova resposta
        await loadComments();
        setReplyingTo(null);
        setReplyContent('');
        toast.success('Resposta publicada!');
      } else {
        // Adicionar novo comentário no topo
        setComments([response.comment, ...comments]);
        setContent('');
        toast.success('Comentário publicado!');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      toast.error('Erro ao publicar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (commentId: string, _handle: string) => {
    setReplyingTo(commentId);
    setReplyContent('');

    // Scroll suave após render
    setTimeout(() => {
      const element = document.getElementById(`reply-input-${commentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      }
    }, 100);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && nextCursor) {
      loadComments(nextCursor);
    }
  };

  const handleLoadMoreReplies = async (commentId: string) => {
    setLoadingReplies(prev => new Map(prev).set(commentId, true));

    try {
      const cursor = repliesCursors.get(commentId);
      const response: any = await apiHelpers.getCommentReplies(postId, commentId, {
        cursor: cursor || undefined,
        limit: 10,
      });

      // Adicionar respostas ao comentário
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [...(c.replies || []), ...response.items],
          };
        }
        return c;
      }));

      // Atualizar cursor
      setRepliesCursors(prev => new Map(prev).set(commentId, response.page.nextCursor));
    } catch (error) {
      console.error('Error loading replies:', error);
      toast.error('Erro ao carregar respostas');
    } finally {
      setLoadingReplies(prev => new Map(prev).set(commentId, false));
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (commentId: string, isReply: boolean, parentId?: string) => {
    if (!editContent.trim()) {
      toast.error('Comentário não pode estar vazio');
      return;
    }

    if (editContent.length > 1000) {
      toast.error('Comentário muito longo (máx 1000 caracteres)');
      return;
    }

    setSubmitting(true);
    try {
      const response: any = await apiHelpers.updateComment(postId, commentId, {
        content: editContent.trim(),
      });

      // Atualizar comentário na lista
      if (isReply && parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: c.replies?.map(r =>
                r.id === commentId
                  ? { ...r, content: response.comment.content, updatedAt: response.comment.updatedAt }
                  : r
              ),
            };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? { ...c, content: response.comment.content, updatedAt: response.comment.updatedAt }
            : c
        ));
      }

      setEditingCommentId(null);
      setEditContent('');
      toast.success('Comentário atualizado!');
    } catch (error: any) {
      console.error('Error updating comment:', error);
      toast.error(error?.message || 'Erro ao atualizar comentário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    setSubmitting(true);
    try {
      await apiHelpers.deleteComment(postId, commentId);

      // Remover comentário da lista
      if (isReply && parentId) {
        setComments(prev => prev.map(c => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: c.replies?.filter(r => r.id !== commentId),
              repliesCount: (c.repliesCount || 0) - 1,
            };
          }
          return c;
        }));
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }

      setShowDeleteDialog(false);
      setDeletingCommentId(null);
      toast.success('Comentário excluído');
    } catch (error: any) {
      console.error('Error deleting comment:', error);

      if (error?.hasReplies) {
        toast.error(`Não é possível excluir. Este comentário tem ${error.repliesCount} resposta(s).`);
      } else {
        toast.error(error?.message || 'Erro ao excluir comentário');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Formulário de comentário */}
      <form onSubmit={(e) => handleSubmit(e)} className="space-y-2">
        <Textarea
          placeholder="Escreva um comentário..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={3}
          className="resize-none"
          disabled={submitting}
        />
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-xs tabular-nums",
            content.length > 900 ? "text-destructive font-medium" :
            content.length > 800 ? "text-orange-500" :
            "text-muted-foreground"
          )}>
            {content.length}/1000
          </span>
          <Button type="submit" disabled={submitting || !content.trim()} size="sm">
            {submitting ? 'Publicando...' : 'Comentar'}
          </Button>
        </div>
      </form>

      {/* Lista de comentários */}
      {loading ? (
        <SkeletonList count={5} SkeletonComponent={CommentSkeleton} />
      ) : comments.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <p className="text-sm font-medium">Nenhum comentário ainda</p>
          <p className="text-xs text-muted-foreground">
            Seja o primeiro a comentar!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                postId={postId}
                replyingTo={replyingTo}
                replyContent={replyContent}
                onReply={handleReply}
                onCancelReply={handleCancelReply}
                onReplyContentChange={setReplyContent}
                onSubmitReply={handleSubmit}
                submitting={submitting}
                onLoadMoreReplies={handleLoadMoreReplies}
                loadingReplies={loadingReplies}
                currentUserHandle={currentUserHandle}
                editingCommentId={editingCommentId}
                editContent={editContent}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onEditContentChange={setEditContent}
                onSaveEdit={handleSaveEdit}
                onDeleteComment={(commentId) => {
                  setDeletingCommentId(commentId);
                  setShowDeleteDialog(true);
                }}
                postAuthorHandle={postAuthorHandle}
              />
            ))}
          </div>

          {/* Botão de carregar mais */}
          {hasMore && nextCursor && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  'Carregar mais comentários'
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comentário será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingCommentId(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deletingCommentId) return;

                // Determinar se é uma resposta e encontrar o parentId
                let isReply = false;
                let parentId: string | undefined;

                // Procurar nos comentários principais
                const mainComment = comments.find((c) => c.id === deletingCommentId);
                if (!mainComment) {
                  // Não é um comentário principal, procurar nas respostas
                  for (const comment of comments) {
                    const reply = comment.replies?.find((r) => r.id === deletingCommentId);
                    if (reply) {
                      isReply = true;
                      parentId = comment.id;
                      break;
                    }
                  }
                }

                handleDeleteComment(deletingCommentId, isReply, parentId);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
