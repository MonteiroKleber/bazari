/**
 * Social App Template
 * Community features with posts, profiles, and interactions
 */

import type { Template } from '../../types/studio.types';

export const socialTemplate: Template = {
  id: 'social',
  name: 'Social App',
  description: 'Build community features with posts, profiles, and social interactions',
  category: 'social',
  icon: 'Users',
  color: '#8B5CF6',
  tags: ['social', 'community', 'posts', 'profiles', 'feed'],
  sdkFeatures: ['wallet', 'storage', 'user'],
  defaultPermissions: [
    { id: 'auth:read', reason: 'Para exibir perfil do usuário' },
    { id: 'wallet:read', reason: 'Para verificar identidade' },
    { id: 'storage:read', reason: 'Para carregar posts' },
    { id: 'storage:write', reason: 'Para salvar posts' },
    { id: 'ui:toast', reason: 'Para exibir notificações' },
  ],
  files: [
    {
      path: 'package.json',
      isTemplate: true,
      content: `{
  "name": "{{slug}}",
  "version": "0.1.0",
  "private": true,
  "description": "{{description}}",
  "author": "{{author}}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}`,
    },
    {
      path: 'bazari.manifest.json',
      isTemplate: true,
      content: `{
  "appId": "com.bazari.{{slug}}",
  "name": "{{name}}",
  "slug": "{{slug}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "category": "social",
  "permissions": [
    { "id": "auth:read", "reason": "Para exibir perfil do usuário" },
    { "id": "wallet:read", "reason": "Para verificar identidade" },
    { "id": "storage:read", "reason": "Para carregar posts" },
    { "id": "storage:write", "reason": "Para salvar posts" },
    { "id": "ui:toast", "reason": "Para exibir notificações" }
  ],
  "sdkVersion": "0.2.0",
  "entryPoint": "dist/index.html",
  "icon": "Users",
  "color": "from-violet-500 to-purple-600"
}`,
    },
    {
      path: 'index.html',
      isTemplate: true,
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'vite.config.ts',
      isTemplate: false,
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});`,
    },
    {
      path: 'tsconfig.json',
      isTemplate: false,
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}`,
    },
    {
      path: 'src/main.tsx',
      isTemplate: false,
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
    },
    {
      path: 'src/App.tsx',
      isTemplate: true,
      content: `import { useState } from 'react';
import { useBazari } from './hooks/useBazari';
import { usePosts } from './hooks/usePosts';
import { Header } from './components/Header';
import { Feed } from './components/Feed';
import { CreatePost } from './components/CreatePost';
import { ProfileCard } from './components/ProfileCard';

function App() {
  const { user, isConnected } = useBazari();
  const { posts, loading, createPost, likePost } = usePosts();
  const [view, setView] = useState<'feed' | 'profile'>('feed');

  if (!isConnected) {
    return (
      <div className="app">
        <div className="connect-prompt">
          <h1>{{name}}</h1>
          <p>Connect your wallet to join the community</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header
        user={user}
        view={view}
        onViewChange={setView}
      />

      <main className="main-content">
        {view === 'feed' ? (
          <div className="feed-container">
            <CreatePost onSubmit={createPost} />
            <Feed
              posts={posts}
              loading={loading}
              onLike={likePost}
              currentUser={user}
            />
          </div>
        ) : (
          <ProfileCard user={user} posts={posts} />
        )}
      </main>
    </div>
  );
}

export default App;`,
    },
    {
      path: 'src/hooks/useBazari.ts',
      isTemplate: false,
      content: `import { useState, useEffect } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

export function useBazari() {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const initSDK = async () => {
      try {
        const bazariSdk = new BazariSDK({ debug: true });
        setSdk(bazariSdk);

        if (bazariSdk.isInBazari()) {
          const currentUser = await bazariSdk.auth.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      }
    };

    initSDK();
  }, []);

  return { sdk, user, isConnected };
}`,
    },
    {
      path: 'src/hooks/usePosts.ts',
      isTemplate: false,
      content: `import { useState, useEffect } from 'react';

export interface Post {
  id: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  timestamp: number;
  likes: string[];
  comments: number;
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load sample posts
    const samplePosts: Post[] = [
      {
        id: '1',
        author: {
          id: 'user-alice',
          name: 'Alice',
        },
        content: 'Just joined this amazing community! Excited to connect with everyone. 🎉',
        timestamp: Date.now() - 3600000,
        likes: ['user-abc'],
        comments: 2,
      },
      {
        id: '2',
        author: {
          id: 'user-bob',
          name: 'Bob',
        },
        content: 'Building something cool on Bazari. Who else is working on decentralized apps?',
        timestamp: Date.now() - 7200000,
        likes: ['user-123', 'user-456'],
        comments: 5,
      },
    ];

    setTimeout(() => {
      setPosts(samplePosts);
      setLoading(false);
    }, 500);
  }, []);

  const createPost = async (content: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      author: {
        id: 'current-user',
        name: 'You',
      },
      content,
      timestamp: Date.now(),
      likes: [],
      comments: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
  };

  const likePost = async (postId: string, userId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const hasLiked = post.likes.includes(userId);
          return {
            ...post,
            likes: hasLiked
              ? post.likes.filter((id) => id !== userId)
              : [...post.likes, userId],
          };
        }
        return post;
      })
    );
  };

  return { posts, loading, createPost, likePost };
}`,
    },
    {
      path: 'src/components/Header.tsx',
      isTemplate: true,
      content: `import type { SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface HeaderProps {
  user: SDKUser | null;
  view: 'feed' | 'profile';
  onViewChange: (view: 'feed' | 'profile') => void;
}

export function Header({ user, view, onViewChange }: HeaderProps) {
  const displayName = user?.displayName || user?.handle || 'User';

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="logo">{{name}}</h1>

        <nav className="nav">
          <button
            className={\`nav-btn \${view === 'feed' ? 'active' : ''}\`}
            onClick={() => onViewChange('feed')}
          >
            Feed
          </button>
          <button
            className={\`nav-btn \${view === 'profile' ? 'active' : ''}\`}
            onClick={() => onViewChange('profile')}
          >
            Profile
          </button>
        </nav>

        {user && (
          <div className="user-badge">
            <div className="avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={displayName} />
              ) : (
                <span>{displayName.charAt(0)}</span>
              )}
            </div>
            <span className="user-name">{displayName}</span>
          </div>
        )}
      </div>
    </header>
  );
}`,
    },
    {
      path: 'src/components/Feed.tsx',
      isTemplate: false,
      content: `import type { Post } from '../hooks/usePosts';
import type { SDKUser } from '@bazari.libervia.xyz/app-sdk';
import { PostCard } from './PostCard';

interface FeedProps {
  posts: Post[];
  loading: boolean;
  onLike: (postId: string, userId: string) => void;
  currentUser: SDKUser | null;
}

export function Feed({ posts, loading, onLike, currentUser }: FeedProps) {
  if (loading) {
    return (
      <div className="feed-loading">
        <div className="spinner"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="feed-empty">
        <p>No posts yet. Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="feed">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onLike={() => currentUser && onLike(post.id, currentUser.id)}
          hasLiked={currentUser ? post.likes.includes(currentUser.id) : false}
        />
      ))}
    </div>
  );
}`,
    },
    {
      path: 'src/components/PostCard.tsx',
      isTemplate: false,
      content: `import type { Post } from '../hooks/usePosts';

interface PostCardProps {
  post: Post;
  onLike: () => void;
  hasLiked: boolean;
}

export function PostCard({ post, onLike, hasLiked }: PostCardProps) {
  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return \`\${seconds}s ago\`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return \`\${minutes}m ago\`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return \`\${hours}h ago\`;
    const days = Math.floor(hours / 24);
    return \`\${days}d ago\`;
  };

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-avatar">
          {post.author.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} />
          ) : (
            <span>{post.author.name.charAt(0)}</span>
          )}
        </div>
        <div className="post-meta">
          <span className="post-author">{post.author.name}</span>
          <span className="post-time">{timeAgo(post.timestamp)}</span>
        </div>
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      <div className="post-actions">
        <button
          className={\`action-btn like-btn \${hasLiked ? 'liked' : ''}\`}
          onClick={onLike}
        >
          <span className="icon">{hasLiked ? '❤️' : '🤍'}</span>
          <span>{post.likes.length}</span>
        </button>
        <button className="action-btn comment-btn">
          <span className="icon">💬</span>
          <span>{post.comments}</span>
        </button>
        <button className="action-btn share-btn">
          <span className="icon">🔗</span>
          <span>Share</span>
        </button>
      </div>
    </article>
  );
}`,
    },
    {
      path: 'src/components/CreatePost.tsx',
      isTemplate: false,
      content: `import { useState } from 'react';

interface CreatePostProps {
  onSubmit: (content: string) => void;
}

export function CreatePost({ onSubmit }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent('');
      setIsExpanded(false);
    }
  };

  return (
    <div className="create-post">
      <form onSubmit={handleSubmit}>
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          rows={isExpanded ? 4 : 2}
        />
        {isExpanded && (
          <div className="create-post-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsExpanded(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!content.trim()}>
              Post
            </button>
          </div>
        )}
      </form>
    </div>
  );
}`,
    },
    {
      path: 'src/components/ProfileCard.tsx',
      isTemplate: false,
      content: `import type { Post } from '../hooks/usePosts';
import type { SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface ProfileCardProps {
  user: SDKUser | null;
  posts: Post[];
}

export function ProfileCard({ user, posts }: ProfileCardProps) {
  if (!user) return null;

  const displayName = user.displayName || user.handle || 'User';
  const userPosts = posts.filter(
    (post) => post.author.id === user.id
  );
  const totalLikes = userPosts.reduce((sum, post) => sum + post.likes.length, 0);

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={displayName} />
          ) : (
            <span>{displayName.charAt(0)}</span>
          )}
        </div>
        <h2 className="profile-name">{displayName}</h2>
        <p className="profile-handle">@{user.handle}</p>
      </div>

      <div className="profile-stats">
        <div className="stat">
          <span className="stat-value">{userPosts.length}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalLikes}</span>
          <span className="stat-label">Likes</span>
        </div>
        <div className="stat">
          <span className="stat-value">0</span>
          <span className="stat-label">Followers</span>
        </div>
      </div>

      <div className="profile-posts">
        <h3>Your Posts</h3>
        {userPosts.length === 0 ? (
          <p className="no-posts">You haven't posted anything yet.</p>
        ) : (
          <div className="posts-list">
            {userPosts.map((post) => (
              <div key={post.id} className="profile-post-item">
                <p>{post.content}</p>
                <span className="post-stats">
                  {post.likes.length} likes · {post.comments} comments
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/styles.css',
      isTemplate: false,
      content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --bg: #0F0F0F;
  --bg-card: #1A1A1A;
  --bg-hover: #252525;
  --text: #FFFFFF;
  --text-secondary: #A0A0A0;
  --border: #2A2A2A;
  --success: #10B981;
  --error: #EF4444;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
}

/* Header */
.header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
}

.nav {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.nav-btn.active {
  background: var(--primary);
  color: white;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar span {
  color: white;
  font-weight: 600;
}

.user-name {
  color: var(--text);
  font-weight: 500;
}

/* Main Content */
.main-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Connect Prompt */
.connect-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  padding: 2rem;
}

.connect-prompt h1 {
  font-size: 2.5rem;
  color: var(--primary);
  margin-bottom: 1rem;
}

.connect-prompt p {
  color: var(--text-secondary);
}

/* Create Post */
.create-post {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--border);
}

.create-post textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  color: var(--text);
  font-size: 1rem;
  resize: none;
  transition: all 0.2s;
}

.create-post textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.create-post-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text);
}

/* Feed */
.feed {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feed-loading,
.feed-empty {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Post Card */
.post-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid var(--border);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.post-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.post-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.post-avatar span {
  color: white;
  font-weight: 600;
  font-size: 1.1rem;
}

.post-meta {
  display: flex;
  flex-direction: column;
}

.post-author {
  font-weight: 600;
  color: var(--text);
}

.post-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.post-content {
  margin-bottom: 1rem;
}

.post-content p {
  color: var(--text);
  white-space: pre-wrap;
}

.post-actions {
  display: flex;
  gap: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--bg-hover);
  color: var(--text);
}

.action-btn.liked {
  color: #EF4444;
}

.action-btn .icon {
  font-size: 1.1rem;
}

/* Profile Card */
.profile-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid var(--border);
}

.profile-header {
  text-align: center;
  margin-bottom: 2rem;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 2rem;
  overflow: hidden;
}

.profile-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar span {
  color: white;
  font-weight: 600;
}

.profile-name {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.profile-address {
  color: var(--text-secondary);
  font-family: monospace;
  font-size: 0.9rem;
}

.profile-stats {
  display: flex;
  justify-content: center;
  gap: 3rem;
  padding: 1.5rem 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin-bottom: 2rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.profile-posts h3 {
  margin-bottom: 1rem;
}

.no-posts {
  color: var(--text-secondary);
  text-align: center;
  padding: 2rem;
}

.profile-post-item {
  padding: 1rem;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.profile-post-item p {
  margin-bottom: 0.5rem;
}

.post-stats {
  font-size: 0.85rem;
  color: var(--text-secondary);
}`,
    },
  ],
};
