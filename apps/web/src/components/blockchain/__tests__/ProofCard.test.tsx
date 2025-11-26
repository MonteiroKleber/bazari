import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProofCard } from '../ProofCard';
import * as useBlockchainQuery from '../../../hooks/useBlockchainQuery';

/**
 * Tests for ProofCard component
 */

vi.mock('../../../hooks/useBlockchainQuery');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('ProofCard', () => {
  it('should render loading state', () => {
    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    render(<ProofCard orderId={123} />);

    // Should show skeleton loader
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('should render error state when no proofs found', () => {
    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Not found'),
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    render(<ProofCard orderId={123} />);

    expect(screen.getByText('No delivery proof found')).toBeTruthy();
  });

  it('should render proof data in full mode', () => {
    const mockProof = {
      orderId: 123,
      proofCid: 'QmTest123456789',
      attestor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      txHash: '0xabcdef1234567890',
      blockNumber: 100,
      submittedAt: new Date('2024-01-01').toISOString(),
    };

    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: mockProof,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    render(<ProofCard orderId={123} />);

    expect(screen.getByText('Delivery Proof')).toBeTruthy();
    expect(screen.getByText(/#123/)).toBeTruthy();
    expect(screen.getByText(/5GrwvaEF.*KutQY/)).toBeTruthy();
    expect(screen.getByText(/QmTest123456789/)).toBeTruthy();
  });

  it('should render proof data in compact mode', () => {
    const mockProof = {
      orderId: 123,
      proofCid: 'QmTest123',
      attestor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      txHash: '0xabc123',
      blockNumber: 100,
      submittedAt: new Date().toISOString(),
    };

    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: mockProof,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    render(<ProofCard orderId={123} compact={true} />);

    expect(screen.getByText('Delivery Proof Submitted')).toBeTruthy();
  });

  it('should call onViewDetails when button is clicked', () => {
    const mockProof = {
      orderId: 123,
      proofCid: 'QmTest123',
      attestor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      txHash: '0xabc123',
      blockNumber: 100,
      submittedAt: new Date().toISOString(),
    };

    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: mockProof,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    const onViewDetails = vi.fn();
    render(<ProofCard orderId={123} onViewDetails={onViewDetails} />);

    const button = screen.getByText('View GPS Tracking');
    button.click();

    expect(onViewDetails).toHaveBeenCalledWith('QmTest123');
  });

  it('should handle array of proofs', () => {
    const mockProofs = [
      {
        orderId: 123,
        proofCid: 'QmTest1',
        attestor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        txHash: '0xabc123',
        blockNumber: 100,
        submittedAt: new Date().toISOString(),
      },
      {
        orderId: 123,
        proofCid: 'QmTest2',
        attestor: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        txHash: '0xdef456',
        blockNumber: 101,
        submittedAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(useBlockchainQuery, 'useBlockchainProofs').mockReturnValue({
      data: mockProofs,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      invalidate: vi.fn(),
    });

    render(<ProofCard orderId={123} />);

    // Should render first proof
    expect(screen.getByText(/QmTest1/)).toBeTruthy();
  });
});
