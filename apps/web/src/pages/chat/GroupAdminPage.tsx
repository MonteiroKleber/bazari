import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '@/hooks/useChat';
import { apiHelpers } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import {
  ArrowLeft,
  UserPlus,
  Crown,
  UserMinus,
  Shield,
  LogOut,
  Save,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function GroupAdminPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, loadGroups, threads } = useChat();

  // Encontrar a thread do grupo para navegação de volta
  const groupThread = threads.find(t => t.groupId === groupId);

  // Função para voltar - vai para a conversa do grupo se existir, senão para lista
  const handleGoBack = () => {
    if (groupThread) {
      navigate(`/app/chat/${groupThread.id}`);
    } else {
      navigate('/app/chat');
    }
  };

  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    maxMembers: 500,
  });

  // Invite member state
  const [inviteHandle, setInviteHandle] = useState('');
  const [inviting, setInviting] = useState(false);

  // Leave group confirmation
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  useEffect(() => {
    loadGroupData();
    loadCurrentUser();
  }, [groupId]);

  const loadCurrentUser = async () => {
    try {
      const profile = await apiHelpers.getMeProfile();
      setCurrentUserId(profile.profile?.id);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadGroupData = async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      // Carregar detalhes do grupo
      const groupData = await apiHelpers.getChatGroup(groupId);
      setGroup(groupData);

      setFormData({
        name: groupData.name,
        description: groupData.description || '',
        isPublic: groupData.isPublic,
        maxMembers: groupData.maxMembers || 500,
      });

      // Carregar perfis dos membros
      const memberProfiles = await Promise.all(
        groupData.memberIds.map(async (memberId: string) => {
          try {
            // Buscar perfil - assumindo que getChatGroup retorna handles
            // Se não, você pode precisar de um endpoint auxiliar
            return {
              id: memberId,
              handle: `user_${memberId.slice(0, 8)}`,
              displayName: `Membro ${memberId.slice(0, 8)}`,
              avatarUrl: null,
              isAdmin: groupData.adminIds.includes(memberId),
            };
          } catch (error) {
            return {
              id: memberId,
              handle: 'unknown',
              displayName: 'Usuário Desconhecido',
              isAdmin: groupData.adminIds.includes(memberId),
            };
          }
        })
      );

      setMembers(memberProfiles);
    } catch (error: any) {
      console.error('Error loading group:', error);
      toast.error('Erro ao carregar grupo');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUserId && group?.adminIds?.includes(currentUserId);
  const isMember = currentUserId && group?.memberIds?.includes(currentUserId);

  const handleSaveChanges = async () => {
    if (!groupId || !isAdmin) return;

    setSaving(true);
    try {
      await apiHelpers.updateGroup(groupId, formData);
      toast.success('Grupo atualizado com sucesso!');
      await loadGroupData();
      await loadGroups();
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast.error(error?.message || 'Erro ao atualizar grupo');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!groupId || !inviteHandle.trim()) return;

    setInviting(true);
    try {
      // Buscar perfil pelo handle
      const cleanHandle = inviteHandle.trim().replace(/^@/, '');
      const profile = await apiHelpers.getPublicProfile(cleanHandle);

      if (!profile?.profile?.id) {
        toast.error('Usuário não encontrado');
        return;
      }

      // Verificar se já é membro
      if (members.some(m => m.id === profile.profile.id)) {
        toast.error('Este usuário já é membro do grupo');
        return;
      }

      // Convidar
      await apiHelpers.inviteToGroup(groupId, profile.profile.id);
      toast.success(`Convite enviado para ${profile.profile.displayName}!`);

      setInviteHandle('');
      await loadGroupData();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error?.message || 'Erro ao convidar membro');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!groupId || !isAdmin) return;

    try {
      await apiHelpers.removeMemberFromGroup(groupId, memberId);
      toast.success('Membro removido do grupo');
      await loadGroupData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error?.message || 'Erro ao remover membro');
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!groupId || !isAdmin) return;

    try {
      await apiHelpers.updateGroupRoles(groupId, memberId, 'promote');
      toast.success('Membro promovido a administrador');
      await loadGroupData();
    } catch (error: any) {
      console.error('Error promoting member:', error);
      toast.error(error?.message || 'Erro ao promover membro');
    }
  };

  const handleDemoteAdmin = async (memberId: string) => {
    if (!groupId || !isAdmin) return;

    try {
      await apiHelpers.updateGroupRoles(groupId, memberId, 'demote');
      toast.success('Administrador removido');
      await loadGroupData();
    } catch (error: any) {
      console.error('Error demoting admin:', error);
      toast.error(error?.message || 'Erro ao remover administrador');
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;

    try {
      await apiHelpers.leaveGroup(groupId);
      toast.success('Você saiu do grupo');
      navigate('/app/chat');
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error?.message || 'Erro ao sair do grupo');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-8">Carregando...</div>
      </div>
    );
  }

  if (!group || !isMember) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Grupo não encontrado ou você não é membro</p>
          <Button onClick={() => navigate('/app/chat')} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-2 md:py-3 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        {isAdmin && (
          <Badge variant="secondary">
            <Crown className="mr-1 h-3 w-3" />
            Administrador
          </Badge>
        )}
      </div>

      {/* Group Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Grupo</CardTitle>
          <CardDescription>
            {isAdmin ? 'Gerencie as configurações do grupo' : 'Visualizar informações do grupo'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Grupo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isAdmin || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isAdmin || saving}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Grupo Público</Label>
              <div className="text-sm text-muted-foreground">
                Qualquer pessoa pode encontrar e entrar
              </div>
            </div>
            <Switch
              checked={formData.isPublic}
              onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              disabled={!isAdmin || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxMembers">Limite de Membros</Label>
            <Input
              id="maxMembers"
              type="number"
              value={formData.maxMembers}
              onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 500 })}
              disabled={!isAdmin || saving}
            />
          </div>

          {isAdmin && (
            <Button onClick={handleSaveChanges} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Members Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Membros ({members.length}/{formData.maxMembers})</CardTitle>
              <CardDescription>Gerencie os membros do grupo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Member */}
          {(isAdmin || group.isPublic) && (
            <div className="flex gap-2">
              <Input
                placeholder="@usuario"
                value={inviteHandle}
                onChange={(e) => setInviteHandle(e.target.value)}
                disabled={inviting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInviteMember();
                  }
                }}
              />
              <Button onClick={handleInviteMember} disabled={inviting || !inviteHandle.trim()}>
                <UserPlus className="mr-2 h-4 w-4" />
                {inviting ? 'Convidando...' : 'Convidar'}
              </Button>
            </div>
          )}

          <Separator />

          {/* Members List */}
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl} />
                    <AvatarFallback>
                      {member.displayName?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.displayName}
                      {member.isAdmin && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {member.id === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          Você
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">@{member.handle}</div>
                  </div>
                </div>

                {/* Actions */}
                {isAdmin && member.id !== currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!member.isAdmin ? (
                        <DropdownMenuItem onClick={() => handlePromoteToAdmin(member.id)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Promover a Admin
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleDemoteAdmin(member.id)}>
                          <Shield className="mr-2 h-4 w-4" />
                          Remover Admin
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive"
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remover do Grupo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>Ações irreversíveis</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setLeaveConfirmOpen(true)}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair do Grupo
          </Button>
        </CardContent>
      </Card>

      {/* Leave Confirmation Dialog */}
      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do Grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja sair do grupo "{group.name}"?
              {isAdmin && group.adminIds.length === 1 && (
                <span className="block mt-2 text-destructive font-medium">
                  Atenção: Você é o último administrador. Você precisa promover outro membro antes de
                  sair.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveGroup}
              className="bg-destructive text-destructive-foreground"
            >
              Sair do Grupo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
