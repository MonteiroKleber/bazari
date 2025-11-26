import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useBlockchainQuery,
  useBlockchainOrder,
  useBlockchainCourier,
} from '../useBlockchainQuery';
import * as apiModule from '../../lib/api';

/**
 * Tests for useBlockchainQuery hooks
 */

vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('useBlockchainQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockData = { id: 1, name: 'Test Order' };
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/1',
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Network error');
    vi.spyOn(apiModule.api, 'get').mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/999',
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBe(null);
  });

  it('should not fetch when enabled is false', async () => {
    const mockData = { id: 1, name: 'Test Order' };
    const getSpy = vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/1',
        enabled: false,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getSpy).not.toHaveBeenCalled();
    expect(result.current.data).toBe(null);
  });

  it('should call onSuccess callback', async () => {
    const mockData = { id: 1, name: 'Test Order' };
    const onSuccess = vi.fn();
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockData);

    renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/1',
        onSuccess,
      })
    );

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('should call onError callback', async () => {
    const mockError = new Error('Network error');
    const onError = vi.fn();
    vi.spyOn(apiModule.api, 'get').mockRejectedValue(mockError);

    renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/999',
        onError,
      })
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('should refetch data when refetch is called', async () => {
    const mockData1 = { id: 1, name: 'Order 1' };
    const mockData2 = { id: 1, name: 'Order 1 Updated' };
    const getSpy = vi
      .spyOn(apiModule.api, 'get')
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/1',
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData1);
    });

    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it('should invalidate data when invalidate is called', async () => {
    const mockData = { id: 1, name: 'Test Order' };
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useBlockchainQuery({
        endpoint: '/api/blockchain/orders/1',
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });

    result.current.invalidate();

    expect(result.current.data).toBe(null);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

describe('useBlockchainOrder', () => {
  it('should fetch order data', async () => {
    const mockOrder = { orderId: 123, buyer: '0x123', seller: '0x456' };
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockOrder);

    const { result } = renderHook(() => useBlockchainOrder(123));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockOrder);
    });
  });

  it('should not fetch when orderId is null', async () => {
    const getSpy = vi.spyOn(apiModule.api, 'get');

    renderHook(() => useBlockchainOrder(null));

    await waitFor(() => {
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});

describe('useBlockchainCourier', () => {
  it('should fetch courier data', async () => {
    const mockCourier = {
      account: '0x789',
      stake: '1000000000000',
      reputationScore: 85,
    };
    vi.spyOn(apiModule.api, 'get').mockResolvedValue(mockCourier);

    const { result } = renderHook(() => useBlockchainCourier('0x789'));

    await waitFor(() => {
      expect(result.current.data).toEqual(mockCourier);
    });
  });

  it('should not fetch when courierAddress is null', async () => {
    const getSpy = vi.spyOn(apiModule.api, 'get');

    renderHook(() => useBlockchainCourier(null));

    await waitFor(() => {
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
