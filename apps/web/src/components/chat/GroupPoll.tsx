import { useState } from 'react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { CheckCircle2, Clock, Users } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface GroupPollProps {
  poll: {
    id: string;
    question: string;
    options: PollOption[];
    createdBy: string;
    createdAt: number;
    expiresAt?: number;
    totalVotes: number;
    userVote?: string; // Option ID the user voted for
  };
  onVote?: (pollId: string, optionId: string) => Promise<void>;
  isLoading?: boolean;
  showResults?: boolean;
}

export function GroupPoll({ poll, onVote, isLoading = false, showResults = false }: GroupPollProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(poll.userVote || null);
  const [hasVoted, setHasVoted] = useState(!!poll.userVote);
  const [voting, setVoting] = useState(false);

  const isExpired = poll.expiresAt ? new Date(poll.expiresAt) < new Date() : false;
  const canVote = !hasVoted && !isExpired && onVote;
  const shouldShowResults = showResults || hasVoted || isExpired;

  const handleVote = async () => {
    if (!selectedOption || !onVote || voting) return;

    try {
      setVoting(true);
      await onVote(poll.id, selectedOption);
      setHasVoted(true);
    } catch (error) {
      console.error('Failed to vote:', error);
      // Don't set hasVoted to true on error
    } finally {
      setVoting(false);
    }
  };

  const getOptionPercentage = (votes: number): number => {
    if (poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  const sortedOptions = shouldShowResults
    ? [...poll.options].sort((a, b) => b.votes - a.votes)
    : poll.options;

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm">{poll.question}</h3>
          {hasVoted && (
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{poll.totalVotes} {poll.totalVotes === 1 ? 'voto' : 'votos'}</span>
          </div>
          {poll.expiresAt && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                {isExpired
                  ? 'Encerrada'
                  : `Até ${new Date(poll.expiresAt).toLocaleDateString('pt-BR')}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {shouldShowResults ? (
          // Results view
          sortedOptions.map((option) => {
            const percentage = getOptionPercentage(option.votes);
            const isUserChoice = option.id === poll.userVote;

            return (
              <div
                key={option.id}
                className={`p-3 rounded-md border transition-colors ${
                  isUserChoice ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{option.text}</span>
                    {isUserChoice && (
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-semibold">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {option.votes} {option.votes === 1 ? 'voto' : 'votos'}
                </p>
              </div>
            );
          })
        ) : (
          // Voting view
          <RadioGroup value={selectedOption || undefined} onValueChange={setSelectedOption}>
            {poll.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center space-x-2 p-3 rounded-md border hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={option.id} id={option.id} disabled={!canVote} />
                <Label
                  htmlFor={option.id}
                  className="font-normal cursor-pointer flex-1"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Vote button */}
      {canVote && (
        <Button
          onClick={handleVote}
          disabled={!selectedOption || voting || isLoading}
          className="w-full"
        >
          {voting ? 'Votando...' : 'Confirmar Voto'}
        </Button>
      )}

      {/* Status messages */}
      {isExpired && (
        <p className="text-xs text-center text-muted-foreground">
          Esta enquete foi encerrada
        </p>
      )}
      {hasVoted && !isExpired && (
        <p className="text-xs text-center text-green-600">
          Seu voto foi registrado com sucesso
        </p>
      )}
    </div>
  );
}
