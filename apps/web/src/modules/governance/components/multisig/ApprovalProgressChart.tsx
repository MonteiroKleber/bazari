import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ApprovalProgressChartProps {
  /**
   * Current number of approvals
   */
  current: number;

  /**
   * Required number of approvals (threshold)
   */
  required: number;

  /**
   * List of signatories with approval status
   */
  signatories: Array<{
    address: string;
    name?: string;
    approved: boolean;
  }>;

  /**
   * Show signatory list
   * @default true
   */
  showSignatories?: boolean;

  /**
   * Chart size
   * @default 200
   */
  size?: number;
}

/**
 * Format address for display
 */
function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * FASE 8: Approval Progress Chart Component
 *
 * Visual representation of multi-sig approval progress with:
 * - Donut chart showing approved vs pending
 * - Percentage display in center
 * - List of signatories with status indicators
 * - Theme-aware colors
 *
 * @example
 * ```tsx
 * <ApprovalProgressChart
 *   current={2}
 *   required={3}
 *   signatories={[
 *     { address: '5Grw...', approved: true },
 *     { address: '5Hgx...', approved: true },
 *     { address: '5Fqz...', approved: false },
 *   ]}
 * />
 * ```
 */
export function ApprovalProgressChart({
  current,
  required,
  signatories,
  showSignatories = true,
  size = 200,
}: ApprovalProgressChartProps) {
  const percentage = required > 0 ? (current / required) * 100 : 0;
  const isComplete = current >= required;

  const data = [
    { name: 'Aprovado', value: current },
    { name: 'Pendente', value: Math.max(0, required - current) },
  ];

  // Theme-aware colors
  const COLORS = {
    approved: 'hsl(var(--chart-aye))', // green
    pending: 'hsl(var(--muted))', // gray
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Donut Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.4}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              <Cell fill={COLORS.approved} />
              <Cell fill={COLORS.pending} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            {isComplete ? (
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            ) : (
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
            )}
            <p className="text-3xl font-bold">{percentage.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              {current}/{required} aprovações
            </p>
          </div>
        </div>
      </div>

      {/* Signatories List */}
      {showSignatories && signatories.length > 0 && (
        <div className="mt-6 space-y-2 w-full max-w-sm">
          <h4 className="text-sm font-semibold mb-3">Signatários</h4>
          {signatories.map((signatory, idx) => (
            <div
              key={signatory.address}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                signatory.approved
                  ? 'bg-green-500/5 hover:bg-green-500/10'
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              {/* Status Indicator */}
              <div
                className={cn(
                  'w-3 h-3 rounded-full flex-shrink-0',
                  signatory.approved ? 'bg-green-500' : 'bg-muted-foreground/30'
                )}
              />

              {/* Signatory Info */}
              <div className="flex-1 min-w-0">
                {signatory.name ? (
                  <>
                    <p className="text-sm font-medium truncate">{signatory.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {formatAddress(signatory.address)}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-mono truncate">
                    {formatAddress(signatory.address)}
                  </p>
                )}
              </div>

              {/* Approval Status */}
              {signatory.approved && (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
          ))}

          {/* Progress Summary */}
          {isComplete ? (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center">
                ✓ Todas as aprovações necessárias coletadas
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                Aguardando {required - current} aprovação(ões)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
