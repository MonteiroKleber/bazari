import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { useCouncilMotion, useCouncilStatus } from '../hooks';
import { toast } from 'sonner';

interface CouncilVoteButtonsProps {
  motionHash: string;
  motionIndex: number;
  onVoteSuccess?: () => void;
  disabled?: boolean;
}

export function CouncilVoteButtons({
  motionHash,
  motionIndex,
  onVoteSuccess,
  disabled = false,
}: CouncilVoteButtonsProps) {
  const { isMember, isLoading: checkingMembership } = useCouncilStatus();
  const { vote, isVoting } = useCouncilMotion();
  const [votingFor, setVotingFor] = useState<'aye' | 'nay' | null>(null);

  const handleVote = async (approve: boolean) => {
    setVotingFor(approve ? 'aye' : 'nay');

    try {
      const success = await vote(motionHash, motionIndex, approve);

      if (success) {
        toast.success(`Voto registrado! Você votou ${approve ? 'SIM' : 'NÃO'} na motion.`);

        if (onVoteSuccess) {
          onVoteSuccess();
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao registrar voto');
    } finally {
      setVotingFor(null);
    }
  };

  if (checkingMembership) {
    return (
      <div className="flex gap-2 justify-end">
        <Button disabled variant="outline" size="sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Verificando...
        </Button>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="text-sm text-muted-foreground text-center py-2">
        Apenas membros do Council podem votar
      </div>
    );
  }

  return (
    <div className="flex gap-2 justify-end">
      <Button
        onClick={() => handleVote(false)}
        disabled={disabled || isVoting}
        variant="outline"
        size="sm"
        className="text-red-600 hover:text-red-700 hover:border-red-600"
      >
        {votingFor === 'nay' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Votando...
          </>
        ) : (
          <>
            <ThumbsDown className="h-4 w-4 mr-2" />
            Votar NÃO
          </>
        )}
      </Button>

      <Button
        onClick={() => handleVote(true)}
        disabled={disabled || isVoting}
        variant="default"
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        {votingFor === 'aye' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Votando...
          </>
        ) : (
          <>
            <ThumbsUp className="h-4 w-4 mr-2" />
            Votar SIM
          </>
        )}
      </Button>
    </div>
  );
}
