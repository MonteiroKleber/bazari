import { useState } from 'react';
import { useMissions, useCreateMission, type MissionType } from '@/hooks/blockchain/useRewards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Plus, Target, AlertTriangle } from 'lucide-react';
import { MissionCard } from '@/components/rewards';
import { getMissionTypeName } from '@/components/rewards/MissionTypeIcon';

/**
 * AdminMissionsManagementPage - Create and manage missions (DAO only)
 *
 * Route: /app/admin/missions
 *
 * Features:
 * - Create new missions
 * - View all missions (active and inactive)
 * - Configure mission parameters
 * - DAO-only access
 */

const MISSION_TYPES: MissionType[] = [
  'CompleteOrders',
  'SpendAmount',
  'ReferUsers',
  'CreateStore',
  'FirstPurchase',
  'DailyStreak',
  'Custom',
];

interface MissionFormData {
  name: string;
  description: string;
  rewardAmount: string;
  missionType: MissionType;
  targetValue: string;
  maxCompletions: string;
  expiresAt: string;
}

const initialFormData: MissionFormData = {
  name: '',
  description: '',
  rewardAmount: '',
  missionType: 'CompleteOrders',
  targetValue: '',
  maxCompletions: '',
  expiresAt: '',
};

export const AdminMissionsManagementPage = () => {
  const { data: missions, refetch } = useMissions();
  const { createMission, isLoading: creating } = useCreateMission();
  const [formData, setFormData] = useState<MissionFormData>(initialFormData);
  const [showForm, setShowForm] = useState(false);

  const handleInputChange = (field: keyof MissionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.description || !formData.rewardAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    const rewardAmount = parseInt(formData.rewardAmount);
    const targetValue = parseInt(formData.targetValue);
    const maxCompletions = parseInt(formData.maxCompletions);

    if (isNaN(rewardAmount) || rewardAmount <= 0) {
      toast.error('Invalid reward amount');
      return;
    }

    if (isNaN(targetValue) || targetValue <= 0) {
      toast.error('Invalid target value');
      return;
    }

    if (isNaN(maxCompletions) || maxCompletions <= 0) {
      toast.error('Invalid max completions');
      return;
    }

    try {
      const expiresAt = formData.expiresAt
        ? Math.floor(new Date(formData.expiresAt).getTime() / 1000)
        : undefined;

      const result = await createMission({
        name: formData.name,
        description: formData.description,
        rewardAmount,
        missionType: formData.missionType,
        targetValue,
        maxCompletions,
        expiresAt,
      });

      if (result?.success) {
        toast.success('Mission created successfully!');
        setFormData(initialFormData);
        setShowForm(false);
        refetch();
      }
    } catch (error) {
      toast.error('Failed to create mission');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
              <Shield className="text-purple-600" size={36} />
              Mission Management
            </h1>
            <p className="text-gray-600">Create and manage missions (DAO only)</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="mr-2" size={20} />
            {showForm ? 'Cancel' : 'Create Mission'}
          </Button>
        </div>
      </div>

      {/* Warning Alert */}
      <Alert className="mb-6 border-yellow-300 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>DAO Access Required:</strong> Only DAO members can create and manage missions.
          Ensure you have the necessary permissions before attempting to create missions.
        </AlertDescription>
      </Alert>

      {/* Create Mission Form */}
      {showForm && (
        <Card className="mb-6 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target size={24} className="text-purple-600" />
              Create New Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mission Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Mission Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Complete 5 Orders"
                    maxLength={64}
                    required
                  />
                </div>

                {/* Mission Type */}
                <div className="space-y-2">
                  <Label htmlFor="missionType">
                    Mission Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.missionType}
                    onValueChange={(value) =>
                      handleInputChange('missionType', value as MissionType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MISSION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getMissionTypeName(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe what users need to do to complete this mission..."
                  maxLength={256}
                  rows={3}
                  required
                />
                <p className="text-xs text-gray-500">
                  {formData.description.length} / 256 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Reward Amount */}
                <div className="space-y-2">
                  <Label htmlFor="rewardAmount">
                    Reward Amount (ZARI) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    value={formData.rewardAmount}
                    onChange={(e) => handleInputChange('rewardAmount', e.target.value)}
                    placeholder="e.g., 100"
                    min="1"
                    required
                  />
                </div>

                {/* Target Value */}
                <div className="space-y-2">
                  <Label htmlFor="targetValue">
                    Target Value <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="targetValue"
                    type="number"
                    value={formData.targetValue}
                    onChange={(e) => handleInputChange('targetValue', e.target.value)}
                    placeholder="e.g., 5"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Number of completions needed (e.g., 5 orders)
                  </p>
                </div>

                {/* Max Completions */}
                <div className="space-y-2">
                  <Label htmlFor="maxCompletions">
                    Max Completions <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="maxCompletions"
                    type="number"
                    value={formData.maxCompletions}
                    onChange={(e) => handleInputChange('maxCompletions', e.target.value)}
                    placeholder="e.g., 100"
                    min="1"
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Total number of users who can claim this mission
                  </p>
                </div>
              </div>

              {/* Expires At (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => handleInputChange('expiresAt', e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Leave empty for missions that don't expire
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData(initialFormData);
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="bg-purple-600 hover:bg-purple-700">
                  {creating ? 'Creating...' : 'Create Mission'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Missions List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">All Missions</h2>
        {missions && missions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <div key={mission.id} className="relative">
                <MissionCard mission={mission} onClaimed={refetch} />
                {!mission.isActive && (
                  <Badge
                    variant="secondary"
                    className="absolute top-4 right-4 bg-gray-500"
                  >
                    Inactive
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Target className="mx-auto mb-3 text-gray-300" size={48} />
            <p>No missions created yet</p>
            <p className="text-sm mt-1">Create your first mission to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminMissionsManagementPage;
