import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissionProgress } from '../MissionProgress';

describe('MissionProgress', () => {
  it('renders progress correctly', () => {
    render(<MissionProgress current={3} target={5} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('(60%)')).toBeInTheDocument();
  });

  it('displays custom label', () => {
    render(<MissionProgress current={2} target={10} label="Your Progress" />);

    expect(screen.getByText('Your Progress')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<MissionProgress current={3} target={5} showPercentage={false} />);

    expect(screen.queryByText('(60%)')).not.toBeInTheDocument();
  });

  it('shows completion state when current >= target', () => {
    render(<MissionProgress current={5} target={5} />);

    expect(screen.getByText('5 / 5')).toBeInTheDocument();
    expect(screen.getByText('(100%)')).toBeInTheDocument();
  });

  it('handles zero progress', () => {
    render(<MissionProgress current={0} target={10} />);

    expect(screen.getByText('0 / 10')).toBeInTheDocument();
    expect(screen.getByText('(0%)')).toBeInTheDocument();
  });
});
