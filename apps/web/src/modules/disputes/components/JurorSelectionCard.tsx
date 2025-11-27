import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JurorSelectionCardProps {
  jurors: string[];
  commitStatus: { juror: string; committed: boolean; revealed: boolean }[];
}

export function JurorSelectionCard({ jurors, commitStatus }: JurorSelectionCardProps) {
  const getJurorStatus = (jurorAddress: string) => {
    const status = commitStatus.find((c) => c.juror === jurorAddress);
    if (!status) return { committed: false, revealed: false };
    return status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Jurados ({jurors.length}/5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {jurors.map((juror, index) => {
            const status = getJurorStatus(juror);
            return (
              <div
                key={juror}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <span className="font-mono text-sm truncate" title={juror}>
                    {juror.slice(0, 6)}...{juror.slice(-4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Commit status */}
                  <Badge
                    variant={status.committed ? 'default' : 'outline'}
                    className={cn(
                      'text-xs px-1.5',
                      status.committed
                        ? 'bg-green-500/20 text-green-700 border-green-500/50'
                        : 'text-muted-foreground'
                    )}
                  >
                    {status.committed ? (
                      <Check className="w-3 h-3 mr-0.5" />
                    ) : (
                      <Clock className="w-3 h-3 mr-0.5" />
                    )}
                    C
                  </Badge>
                  {/* Reveal status */}
                  <Badge
                    variant={status.revealed ? 'default' : 'outline'}
                    className={cn(
                      'text-xs px-1.5',
                      status.revealed
                        ? 'bg-blue-500/20 text-blue-700 border-blue-500/50'
                        : 'text-muted-foreground'
                    )}
                  >
                    {status.revealed ? (
                      <Check className="w-3 h-3 mr-0.5" />
                    ) : (
                      <Clock className="w-3 h-3 mr-0.5" />
                    )}
                    R
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="px-1.5 text-xs">C</Badge>
              Commit
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="px-1.5 text-xs">R</Badge>
              Reveal
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
