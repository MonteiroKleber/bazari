import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  AlertTriangle,
  ExternalLink,
  Loader2,
  FileText,
  Calendar,
  User,
  Tag,
} from 'lucide-react';
import { useCanReviewApps } from '@/hooks/useIsAdmin';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { toast } from 'sonner';

/**
 * AdminAppReviewPage - Admin page for reviewing submitted apps
 *
 * Route: /app/admin/app-reviews
 *
 * Features:
 * - List all apps pending review
 * - View app details, screenshots, permissions
 * - Approve or reject apps with feedback
 * - View review history
 */

interface PendingApp {
  id: string;
  appId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  currentVersion: string;
  icon: string;
  screenshots: string[];
  permissions: { id: string; reason: string }[];
  monetizationType: 'FREE' | 'PAID' | 'FREEMIUM' | 'SUBSCRIPTION';
  price?: number;
  developer: {
    id: string;
    address: string;
    profile?: {
      displayName?: string;
      handle?: string;
    };
  };
  submittedAt?: string;
  bundleUrl: string;
  bundleHash: string;
  status: 'DRAFT' | 'PENDING' | 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED' | 'DEPRECATED' | 'UNPUBLISHED';
  reviewNotes?: string;
  reviewedAt?: string;
  reviewerId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAppReviewPage() {
  // TODO: Integrar com governance/conselho para aprovação de apps
  const canReviewApps = useCanReviewApps();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<PendingApp | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject';
    app: PendingApp | null;
  }>({ open: false, action: 'approve', app: null });
  const [reviewNotes, setReviewNotes] = useState('');

  // Fetch pending apps
  const { data: apps, isLoading } = useQuery<PendingApp[]>({
    queryKey: ['admin', 'app-reviews', activeTab],
    queryFn: async () => {
      // api.get returns JSON directly (not { data: ... })
      const apps = await api.get<PendingApp[]>(`/api/admin/app-reviews?status=${activeTab}`);
      return apps;
    },
    enabled: canReviewApps,
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      appId,
      action,
      notes,
    }: {
      appId: string;
      action: 'approve' | 'reject';
      notes: string;
    }) => {
      // api.post returns JSON directly (not { data: ... })
      const result = await api.post(`/api/admin/app-reviews/${appId}/${action}`, {
        notes,
      });
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === 'approve'
          ? 'App approved successfully!'
          : 'App rejected'
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'app-reviews'] });
      setReviewDialog({ open: false, action: 'approve', app: null });
      setSelectedApp(null);
      setReviewNotes('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to process review');
    },
  });

  // Filter apps by search
  const filteredApps = apps?.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.appId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.developer.profile?.displayName || app.developer.profile?.handle || app.developer.address).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to get developer display name
  const getDeveloperName = (app: PendingApp) =>
    app.developer.profile?.displayName ||
    app.developer.profile?.handle ||
    `${app.developer.address.slice(0, 8)}...`;

  // Access denied for non-admins
  // TODO: Integrar com governance/conselho
  if (!canReviewApps) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need to be an admin to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleReview = (action: 'approve' | 'reject', app: PendingApp) => {
    setReviewDialog({ open: true, action, app });
    setReviewNotes('');
  };

  const submitReview = () => {
    if (!reviewDialog.app) return;
    reviewMutation.mutate({
      appId: reviewDialog.app.id,
      action: reviewDialog.action,
      notes: reviewNotes,
    });
  };

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          App Review Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve apps submitted to the Bazari App Store
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Pending Review"
          value={apps?.filter((a) => a.status === 'PENDING').length ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="text-orange-600"
        />
        <StatCard
          title="In Review"
          value={apps?.filter((a) => a.status === 'IN_REVIEW').length ?? 0}
          icon={<Eye className="h-5 w-5" />}
          color="text-blue-600"
        />
        <StatCard
          title="Approved"
          value={apps?.filter((a) => a.status === 'APPROVED').length ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="text-green-600"
        />
        <StatCard
          title="Rejected"
          value={apps?.filter((a) => a.status === 'REJECTED').length ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          color="text-red-600"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search apps by name, ID, or developer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="IN_REVIEW">In Review</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>

        {['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-2">Loading apps...</p>
              </div>
            ) : filteredApps && filteredApps.length > 0 ? (
              <div className="grid gap-4">
                {filteredApps
                  .filter((a) => a.status === status)
                  .map((app) => (
                    <AppReviewCard
                      key={app.id}
                      app={app}
                      onView={() => setSelectedApp(app)}
                      onApprove={() => handleReview('approve', app)}
                      onReject={() => handleReview('reject', app)}
                    />
                  ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No apps {status.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* App Detail Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <img
                    src={selectedApp.icon}
                    alt={selectedApp.name}
                    className="w-16 h-16 rounded-xl"
                  />
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedApp.name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedApp.appId} v{selectedApp.currentVersion}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedApp.description}
                  </p>
                </div>

                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>Category:</span>
                    <Badge variant="secondary">{selectedApp.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Developer:</span>
                    <span className="font-medium">
                      {getDeveloperName(selectedApp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Submitted:</span>
                    <span>
                      {selectedApp.submittedAt
                        ? format(new Date(selectedApp.submittedAt), 'PPp')
                        : format(new Date(selectedApp.updatedAt), 'PPp')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Version:</span>
                    <span>{selectedApp.currentVersion}</span>
                  </div>
                </div>

                {/* Monetization */}
                <div>
                  <h4 className="font-semibold mb-2">Monetization</h4>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedApp.monetizationType === 'FREE'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {selectedApp.monetizationType}
                    </Badge>
                    {selectedApp.price && (
                      <span className="text-sm font-medium">
                        {selectedApp.price} BZR
                      </span>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-semibold mb-2">
                    Permissions ({selectedApp.permissions.length})
                  </h4>
                  {selectedApp.permissions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedApp.permissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded"
                        >
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{perm.id}</p>
                            <p className="text-xs text-muted-foreground">
                              {perm.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No special permissions required
                    </p>
                  )}
                </div>

                {/* Screenshots */}
                {selectedApp.screenshots.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Screenshots</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedApp.screenshots.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="rounded border aspect-video object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bundle Info */}
                <div>
                  <h4 className="font-semibold mb-2">Bundle</h4>
                  <div className="p-3 bg-muted/50 rounded font-mono text-xs space-y-1">
                    <p>Hash: {selectedApp.bundleHash}</p>
                    <a
                      href={selectedApp.bundleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View Bundle <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Review Notes (if any) */}
                {selectedApp.reviewNotes && (
                  <div>
                    <h4 className="font-semibold mb-2">Review Notes</h4>
                    <div className="p-3 bg-muted/50 rounded text-sm">
                      {selectedApp.reviewNotes}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedApp(null)}>
                  Close
                </Button>
                {(selectedApp.status === 'PENDING' || selectedApp.status === 'PENDING_REVIEW') && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => handleReview('reject', selectedApp)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleReview('approve', selectedApp)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Confirmation Dialog */}
      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) =>
          setReviewDialog({ ...reviewDialog, open })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve App' : 'Reject App'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? `Are you sure you want to approve "${reviewDialog.app?.name}"? It will be published to the App Store.`
                : `Please provide a reason for rejecting "${reviewDialog.app?.name}".`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Textarea
              placeholder={
                reviewDialog.action === 'approve'
                  ? 'Optional notes for the developer...'
                  : 'Reason for rejection (required)...'
              }
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setReviewDialog({ open: false, action: 'approve', app: null })
              }
            >
              Cancel
            </Button>
            <Button
              variant={
                reviewDialog.action === 'approve' ? 'default' : 'destructive'
              }
              onClick={submitReview}
              disabled={
                reviewMutation.isPending ||
                (reviewDialog.action === 'reject' && !reviewNotes.trim())
              }
            >
              {reviewMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${color}`}>
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

interface AppReviewCardProps {
  app: PendingApp;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}

function AppReviewCard({ app, onView, onApprove, onReject }: AppReviewCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <img
            src={app.icon}
            alt={app.name}
            className="w-16 h-16 rounded-xl flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">{app.name}</h3>
              <Badge variant="secondary">{app.category}</Badge>
              <Badge
                variant={
                  app.monetizationType === 'FREE' ? 'outline' : 'default'
                }
              >
                {app.monetizationType}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {app.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>v{app.currentVersion}</span>
              <span>•</span>
              <span>by {app.developer.profile?.displayName || app.developer.profile?.handle || `${app.developer.address.slice(0, 8)}...`}</span>
              <span>•</span>
              <span>{format(new Date(app.submittedAt || app.updatedAt), 'PP')}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onView}>
              <Eye className="h-4 w-4" />
            </Button>
            {(app.status === 'PENDING' || app.status === 'PENDING_REVIEW') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={onReject}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={onApprove}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
