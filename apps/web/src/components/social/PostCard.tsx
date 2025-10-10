// apps/web/src/components/social/PostCard.tsx

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Repeat2, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LikeButton } from './LikeButton';
import { ProfileHoverCard } from './ProfileHoverCard';
import { BadgeIcon } from './BadgeIcon';

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
    media?: Array<{ url: string; type: string }>;
    createdAt: string;
    // Contadores e interações (vir da API)
    likesCount?: number;
    commentsCount?: number;
    repostsCount?: number;
    isLiked?: boolean;
  };
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
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

          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-3">
          <p className="whitespace-pre-wrap break-words">
            {post.content}
          </p>
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className={`grid gap-2 mb-3 ${
            post.media.length === 1 ? 'grid-cols-1' :
            post.media.length === 2 ? 'grid-cols-2' :
            'grid-cols-2'
          }`}>
            {post.media.map((item, index) => (
              <img
                key={index}
                src={item.url}
                alt={`Media ${index + 1}`}
                className="w-full h-auto rounded-md object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <LikeButton
            postId={post.id}
            initialLiked={post.isLiked || false}
            initialCount={post.likesCount || 0}
          />

          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            {post.commentsCount || 0}
          </Button>

          <Button variant="ghost" size="sm" className="gap-2">
            <Repeat2 className="h-4 w-4" />
            {post.repostsCount || 0}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
