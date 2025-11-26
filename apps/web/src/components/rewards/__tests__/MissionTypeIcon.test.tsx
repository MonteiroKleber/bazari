import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MissionTypeIcon, getMissionTypeName } from '../MissionTypeIcon';

describe('MissionTypeIcon', () => {
  it('renders CompleteOrders icon', () => {
    render(<MissionTypeIcon type="CompleteOrders" />);
    const icon = screen.getByRole('img', { name: /CompleteOrders mission/ });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent('📦');
  });

  it('renders SpendAmount icon', () => {
    render(<MissionTypeIcon type="SpendAmount" />);
    const icon = screen.getByRole('img', { name: /SpendAmount mission/ });
    expect(icon).toHaveTextContent('💰');
  });

  it('renders DailyStreak icon', () => {
    render(<MissionTypeIcon type="DailyStreak" />);
    const icon = screen.getByRole('img', { name: /DailyStreak mission/ });
    expect(icon).toHaveTextContent('🔥');
  });

  it('applies correct size', () => {
    render(<MissionTypeIcon type="CompleteOrders" size={32} />);
    const icon = screen.getByRole('img');
    expect(icon).toHaveStyle({ width: '32px', height: '32px' });
  });
});

describe('getMissionTypeName', () => {
  it('returns correct display names', () => {
    expect(getMissionTypeName('CompleteOrders')).toBe('Complete Orders');
    expect(getMissionTypeName('SpendAmount')).toBe('Spend Amount');
    expect(getMissionTypeName('ReferUsers')).toBe('Refer Users');
    expect(getMissionTypeName('DailyStreak')).toBe('Daily Streak');
  });
});
