// apps/web/src/components/social/PollCard.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { apiHelpers } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PollOption {
  index: number;
  text: string;
  votes: number;
}

interface PollCardProps {
  postId: string;
  poll: {
    options: PollOption[];
    totalVotes: number;
    endsAt: string;
    hasVoted: boolean;
    userVote?: number[];
    allowMultiple: boolean;
  };
}

export function PollCard({ postId, poll: initialPoll }: PollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOptions, setSelectedOptions] = useState<number[]>(poll.userVote || []);
  const [voting, setVoting] = useState(false);

  const isExpired = new Date(poll.endsAt) < new Date();
  const canVote = !poll.hasVoted && !isExpired;

  const timeRemaining = isExpired
    ? 'Encerrada'
    : formatDistanceToNow(new Date(poll.endsAt), {
        addSuffix: true,
        locale: ptBR,
      });

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error('Selecione uma opção');
      return;
    }

    setVoting(true);
    try {
      const response: any = await apiHelpers.votePoll(postId, {
        optionIndex: poll.allowMultiple ? selectedOptions : selectedOptions[0],
      });

      setPoll(response.poll);
      toast.success('Voto registrado!');
    } catch (error: any) {
      console.error('Error voting:', error);
      toast.error(error?.message || 'Erro ao votar');
    } finally {
      setVoting(false);
    }
  };

  const handleOptionChange = (optionIndex: number) => {
    if (poll.allowMultiple) {
      // Checkbox
      if (selectedOptions.includes(optionIndex)) {
        setSelectedOptions(selectedOptions.filter((i) => i !== optionIndex));
      } else {
        setSelectedOptions([...selectedOptions, optionIndex]);
      }
    } else {
      // Radio
      setSelectedOptions([optionIndex]);
    }
  };

  return (
    <div className="space-y-3">
      {canVote ? (
        <>
          {/* Votação ativa */}
          {poll.allowMultiple ? (
            <div className="space-y-2">
              {poll.options.map((option) => (
                <div key={option.index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`option-${option.index}`}
                    checked={selectedOptions.includes(option.index)}
                    onCheckedChange={() => handleOptionChange(option.index)}
                  />
                  <Label
                    htmlFor={`option-${option.index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptions[0]?.toString()}
              onValueChange={(val) => handleOptionChange(parseInt(val))}
            >
              {poll.options.map((option) => (
                <div key={option.index} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.index.toString()}
                    id={`option-${option.index}`}
                  />
                  <Label
                    htmlFor={`option-${option.index}`}
                    className="flex-1 cursor-pointer"
                  >
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          <Button
            onClick={handleVote}
            disabled={voting || selectedOptions.length === 0}
            className="w-full"
          >
            {voting ? 'Votando...' : 'Votar'}
          </Button>
        </>
      ) : (
        <>
          {/* Resultados */}
          <div className="space-y-2">
            {poll.options.map((option) => {
              const percentage =
                poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
              const isUserVote = poll.userVote?.includes(option.index);

              return (
                <div key={option.index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={isUserVote ? 'font-semibold' : ''}>
                      {option.text}
                      {isUserVote && ' ✓'}
                    </span>
                    <span className="text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="text-sm text-muted-foreground flex items-center justify-between pt-2 border-t">
        <span>{poll.totalVotes} votos</span>
        <span>{timeRemaining}</span>
      </div>
    </div>
  );
}
