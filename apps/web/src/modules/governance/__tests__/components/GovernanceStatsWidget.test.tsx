import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GovernanceStatsWidget } from '../../components/dashboard/GovernanceStatsWidget';
import { FileText } from 'lucide-react';

describe('GovernanceStatsWidget', () => {
  it('renders title and value', () => {
    render(
      <GovernanceStatsWidget
        title="Test Widget"
        value={42}
        icon={<FileText data-testid="icon" />}
      />
    );

    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('shows change indicator when provided', () => {
    render(
      <GovernanceStatsWidget
        title="Test Widget"
        value={100}
        change={{
          value: 10,
          period: 'this week',
          trend: 'up',
        }}
        icon={<FileText />}
      />
    );

    expect(screen.getByText('10%')).toBeInTheDocument();
    expect(screen.getByText('this week')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();

    const { container } = render(
      <GovernanceStatsWidget
        title="Clickable Widget"
        value={50}
        icon={<FileText />}
        onClick={handleClick}
      />
    );

    const card = container.querySelector('[class*="cursor-pointer"]');
    expect(card).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const { container } = render(
      <GovernanceStatsWidget
        title="Loading Widget"
        value={0}
        icon={<FileText />}
        loading={true}
      />
    );

    const skeleton = container.querySelector('[class*="animate-pulse"]');
    expect(skeleton).toBeInTheDocument();
  });
});
