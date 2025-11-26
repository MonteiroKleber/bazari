import { Button } from '@/components/ui/button';
import { useClaimRewardMutation } from '@/hooks/blockchain/useRewards';
import { toast } from 'sonner';
import { Loader2, Gift } from 'lucide-react';

/**
 * ClaimRewardButton - Button to claim mission rewards
 */

interface ClaimRewardButtonProps {
  missionId: number;
  rewardAmount: number;
  disabled?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export const ClaimRewardButton = ({
  missionId,
  rewardAmount,
  disabled = false,
  onSuccess,
  className = '',
}: ClaimRewardButtonProps) => {
  const { claimReward, isLoading, isSuccess } = useClaimRewardMutation();

  const handleClaim = async () => {
    try {
      const result = await claimReward(missionId);
      if (result?.success) {
        toast.success(`Reward claimed! +${rewardAmount} ZARI`, {
          icon: '🎉',
          duration: 5000,
        });
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Failed to claim reward. Please try again.');
    }
  };

  return (
    <Button
      onClick={handleClaim}
      disabled={disabled || isLoading || isSuccess}
      className={`${className}`}
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Claiming...
        </>
      ) : isSuccess ? (
        <>
          <Gift className="mr-2 h-4 w-4" />
          Claimed
        </>
      ) : (
        <>
          <Gift className="mr-2 h-4 w-4" />
          Claim Reward
        </>
      )}
    </Button>
  );
};
