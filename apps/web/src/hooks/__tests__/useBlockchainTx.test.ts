import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useBlockchainTx,
  useCreateOrder,
  useSubmitProof,
} from '../useBlockchainTx';
import * as apiModule from '../../lib/api';

/**
 * Tests for useBlockchainTx hooks
 */

vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useBlockchainTx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send transaction successfully', async () => {
    const mockResponse = {
      txHash: '0xabc123',
      blockNumber: 100,
      success: true,
    };
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);

    let response: any;
    await act(async () => {
      response = await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: { buyer: '0x123', seller: '0x456' },
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockResponse);
    expect(response).toEqual(mockResponse);
  });

  it('should handle transaction errors', async () => {
    const mockError = new Error('Transaction failed');
    vi.spyOn(apiModule.api, 'post').mockRejectedValue(mockError);

    const { result } = renderHook(() => useBlockchainTx());

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.data).toBe(null);
  });

  it('should call onSuccess callback', async () => {
    const mockResponse = { txHash: '0xabc123', success: true };
    const onSuccess = vi.fn();
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx({ onSuccess }));

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('should call onError callback', async () => {
    const mockError = new Error('Transaction failed');
    const onError = vi.fn();
    vi.spyOn(apiModule.api, 'post').mockRejectedValue(mockError);

    const { result } = renderHook(() => useBlockchainTx({ onError }));

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  it('should call onSettled callback on success', async () => {
    const mockResponse = { txHash: '0xabc123', success: true };
    const onSettled = vi.fn();
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx({ onSettled }));

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    await waitFor(() => {
      expect(onSettled).toHaveBeenCalled();
    });
  });

  it('should call onSettled callback on error', async () => {
    const mockError = new Error('Transaction failed');
    const onSettled = vi.fn();
    vi.spyOn(apiModule.api, 'post').mockRejectedValue(mockError);

    const { result } = renderHook(() => useBlockchainTx({ onSettled }));

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    await waitFor(() => {
      expect(onSettled).toHaveBeenCalled();
    });
  });

  it('should reset state when reset is called', async () => {
    const mockResponse = { txHash: '0xabc123', success: true };
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx());

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders',
        method: 'POST',
        data: {},
      });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).not.toBe(null);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.data).toBe(null);
  });

  it('should support PUT method', async () => {
    const mockResponse = { success: true };
    const putSpy = vi.spyOn(apiModule.api, 'put').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx());

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders/1',
        method: 'PUT',
        data: { status: 'completed' },
      });
    });

    expect(putSpy).toHaveBeenCalledWith('/api/blockchain/orders/1', {
      status: 'completed',
    });
  });

  it('should support DELETE method', async () => {
    const mockResponse = { success: true };
    const deleteSpy = vi.spyOn(apiModule.api, 'delete').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useBlockchainTx());

    await act(async () => {
      await result.current.sendTx({
        endpoint: '/api/blockchain/orders/1',
        method: 'DELETE',
      });
    });

    expect(deleteSpy).toHaveBeenCalledWith('/api/blockchain/orders/1');
  });
});

describe('useCreateOrder', () => {
  it('should create order successfully', async () => {
    const mockResponse = { txHash: '0xabc123', orderId: 123, success: true };
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCreateOrder());

    await act(async () => {
      await result.current.createOrder({
        buyer: '0x123',
        seller: '0x456',
        marketplace: 1,
        items: [],
        totalAmount: '1000000000000',
      });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockResponse);
  });
});

describe('useSubmitProof', () => {
  it('should submit proof successfully', async () => {
    const mockResponse = { txHash: '0xdef456', success: true };
    vi.spyOn(apiModule.api, 'post').mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSubmitProof());

    await act(async () => {
      await result.current.submitProof({
        orderId: 123,
        proofCid: 'QmTest123',
        attestor: '0x789',
      });
    });

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toEqual(mockResponse);
  });
});
