import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * MissionFilters - Tab filters for missions (All, Active, Completed)
 */

export type MissionFilter = 'all' | 'active' | 'completed';

interface MissionFiltersProps {
  value: MissionFilter;
  onChange: (filter: MissionFilter) => void;
  counts?: {
    all: number;
    active: number;
    completed: number;
  };
}

export const MissionFilters = ({
  value,
  onChange,
  counts,
}: MissionFiltersProps) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as MissionFilter)}>
      <TabsList>
        <TabsTrigger value="all">
          All
          {counts && <span className="ml-2 text-xs opacity-70">({counts.all})</span>}
        </TabsTrigger>
        <TabsTrigger value="active">
          Active
          {counts && <span className="ml-2 text-xs opacity-70">({counts.active})</span>}
        </TabsTrigger>
        <TabsTrigger value="completed">
          Completed
          {counts && <span className="ml-2 text-xs opacity-70">({counts.completed})</span>}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
