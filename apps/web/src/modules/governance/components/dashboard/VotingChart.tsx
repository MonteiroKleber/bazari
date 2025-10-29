import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VotingChartData, ChartType } from '../../types';

export interface VotingChartProps {
  data: VotingChartData[];
  type?: ChartType;
  title?: string;
  height?: number;
  showLegend?: boolean;
}

// Theme-aware colors using CSS variables
const CHART_COLORS = {
  aye: 'hsl(var(--chart-aye))',
  nay: 'hsl(var(--chart-nay))',
  abstain: 'hsl(var(--chart-abstain))',
};

/**
 * Custom tooltip for better data display
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <Card className="shadow-lg">
      <CardContent className="p-3 space-y-1">
        <p className="font-semibold text-sm">
          {payload[0]?.payload?.proposalTitle || `Proposta #${label}`}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">{entry.value.toLocaleString()}</span>
          </p>
        ))}
        {payload[0]?.payload?.turnout && (
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Turnout: {payload[0].payload.turnout}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * FASE 8: Voting Chart Component
 *
 * Displays voting data in multiple chart formats:
 * - Bar Chart: Compare votes across proposals
 * - Pie Chart: Vote distribution for single proposal
 * - Line Chart: Vote trends over time
 *
 * Features:
 * - Responsive design
 * - Theme-aware colors
 * - Interactive tooltips
 * - Multiple chart types
 * - Accessibility support
 */
export function VotingChart({
  data,
  type = 'bar',
  title,
  height = 300,
  showLegend = true,
}: VotingChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum dado de votação disponível
        </CardContent>
      </Card>
    );
  }

  // For pie chart, transform data to pie format
  const getPieData = () => {
    if (data.length === 0) return [];

    const firstProposal = data[0];
    return [
      { name: 'Aye', value: firstProposal.ayeVotes, fill: CHART_COLORS.aye },
      { name: 'Nay', value: firstProposal.nayVotes, fill: CHART_COLORS.nay },
      ...(firstProposal.abstain
        ? [{ name: 'Abstain', value: firstProposal.abstain, fill: CHART_COLORS.abstain }]
        : []),
    ];
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="proposalId"
                label={{ value: 'Proposta', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Votos', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Bar dataKey="ayeVotes" fill={CHART_COLORS.aye} name="Aye" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nayVotes" fill={CHART_COLORS.nay} name="Nay" radius={[4, 4, 0, 0]} />
              {data.some(d => d.abstain) && (
                <Bar dataKey="abstain" fill={CHART_COLORS.abstain} name="Abstain" radius={[4, 4, 0, 0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = getPieData();
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="proposalId"
                label={{ value: 'Proposta', position: 'insideBottom', offset: -5 }}
              />
              <YAxis label={{ value: 'Votos', angle: -90, position: 'insideLeft' }} />
              <Tooltip content={<CustomTooltip />} />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="ayeVotes"
                stroke={CHART_COLORS.aye}
                name="Aye"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="nayVotes"
                stroke={CHART_COLORS.nay}
                name="Nay"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (title) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{renderChart()}</CardContent>
      </Card>
    );
  }

  return renderChart();
}
