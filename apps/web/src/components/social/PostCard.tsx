// apps/web/src/components/social/PostCard.tsx

import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Pin, Repeat } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LikeButton } from './LikeButton';
import { RepostButton } from './RepostButton';
import { BookmarkButton } from './BookmarkButton';
import { PollCard } from './PollCard';
import { PostOptionsMenu } from './PostOptionsMenu';
import { ProfileHoverCard } from './ProfileHoverCard';
import { BadgeIcon } from './BadgeIcon';
import { ReactionPicker } from './ReactionPicker';

interface PostCardProps {
  post: {
    id: string;
    author: {
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
      badges?: Array<{ slug: string; name: string; description: string; tier: number }>;
    };
    content: string;
    media?: Array<{ url: string; type: string; thumbnailUrl?: string }>;
    createdAt: string;
    kind?: string;
    poll?: {
      options: Array<{ index: number; text: string; votes: number }>;
      totalVotes: number;
      endsAt: string;
      hasVoted: boolean;
      userVote?: number[];
      allowMultiple: boolean;
    };
    // Contadores e interações (vir da API)
    likesCount?: number;
    commentsCount?: number;
    repostsCount?: number;
    isLiked?: boolean;
    isReposted?: boolean;
    isBookmarked?: boolean;
    isPinned?: boolean;
    // Reações
    reactions?: {
      love: number;
      laugh: number;
      wow: number;
      sad: number;
      angry: number;
    };
    userReaction?: string;
    // Repost info
    repostedBy?: {
      handle: string;
      displayName: string;
      avatarUrl?: string | null;
    };
    repostedAt?: string;
  };
  currentUserHandle?: string;
  onDeleted?: () => void;
  onUpdated?: (updatedPost: any) => void;
  onPinned?: (pinned: boolean) => void;
}

export function PostCard({ post, currentUserHandle, onDeleted, onUpdated, onPinned }: PostCardProps) {
  const navigate = useNavigate();
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    navigate(`/app/posts/${post.id}`);
  };

  return (
    <Card className="overflow-hidden cursor-pointer hover:bg-muted/30 transition-colors" onClick={handleCardClick}>
      <CardContent className="p-4">
        {/* Repost Indicator */}
        {post.repostedBy && (
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Repeat className="h-4 w-4" />
            <Link
              to={`/u/${post.repostedBy.handle}`}
              className="hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {post.repostedBy.displayName}
            </Link>
            <span>repostou</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/u/${post.author.handle}`}>
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={post.author.displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted" />
            )}
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <ProfileHoverCard handle={post.author.handle}>
                <Link
                  to={`/u/${post.author.handle}`}
                  className="font-semibold hover:underline"
                >
                  {post.author.displayName}
                </Link>
              </ProfileHoverCard>

              {/* Badge VERIFIED ao lado do nome */}
              {post.author.badges?.find(b => b.slug === 'VERIFIED') && (
                <BadgeIcon
                  badge={post.author.badges.find(b => b.slug === 'VERIFIED')!}
                  size="sm"
                />
              )}

              <ProfileHoverCard handle={post.author.handle}>
                <Link
                  to={`/u/${post.author.handle}`}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  @{post.author.handle}
                </Link>
              </ProfileHoverCard>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {timeAgo}
              </span>
            </div>
          </div>

          <PostOptionsMenu
            postId={post.id}
            authorHandle={post.author.handle}
            currentUserHandle={currentUserHandle}
            onDeleted={onDeleted}
            post={post}
            onUpdated={onUpdated}
            onPinned={onPinned}
          />
        </div>

        {/* Pinned Badge */}
        {post.isPinned && (
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Pin className="h-4 w-4 fill-current" />
            <span>Post fixado</span>
          </div>
        )}

        {/* Content */}
        <div className="mb-3">
          <p className="whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>

        {/* Poll */}
        {post.kind === 'poll' && post.poll && (
          <div className="mb-3">
            <PollCard postId={post.id} poll={post.poll} />
          </div>
        )}

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-2 mb-3 ${
            post.media.length === 1 ? 'grid-cols-1' :
            post.media.length === 2 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {post.media.map((item, index) => (
              item.type === 'video' ? (
                <video
                  key={index}
                  src={item.url}
                  controls
                  className="w-full h-auto rounded-md bg-black"
                  poster={item.thumbnailUrl}
                  preload="metadata"
                />
              ) : (
                <img
                  key={index}
                  src={item.url}
                  alt={`Media ${index + 1}`}
                  className="w-full h-auto rounded-md object-cover"
                  loading="lazy"
                />
              )
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <ReactionPicker
            postId={post.id}
            initialReactions={post.reactions || {
              love: post.likesCount || 0, // Fallback para likesCount
              laugh: 0,
              wow: 0,
              sad: 0,
              angry: 0,
            }}
            userReaction={post.userReaction || (post.isLiked ? 'love' : undefined)}
          />

          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/app/posts/${post.id}`)}
          >
            <MessageCircle className="h-4 w-4" />
            {post.commentsCount || 0}
          </Button>

          <RepostButton
            postId={post.id}
            initialReposted={post.isReposted || false}
            initialCount={post.repostsCount || 0}
          />

          <BookmarkButton
            postId={post.id}
            initialBookmarked={post.isBookmarked || false}
          />
        </div>
      </CardContent>
    </Card>
  );
}
