import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: Record<string, any>) => opts?.defaultValue ?? _key,
    i18n: { language: 'pt-BR' },
  }),
}));

vi.mock('@/components/Header', () => ({ Header: () => <div data-testid="header" /> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <div data-testid="footer" /> }));

const mockFetchOnChainStore = vi.hoisted(() => vi.fn());

vi.mock('@/modules/store/onchain', async () => {
  const actual = await vi.importActual<any>('@/modules/store/onchain');
  return {
    ...actual,
    fetchOnChainStore: mockFetchOnChainStore,
    resolveIpfsUrl: (value: string | undefined | null) => value ?? undefined,
  };
});

const mockGetPublicJSON = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<any>('@/lib/api');
  return {
    ...actual,
    getPublicJSON: mockGetPublicJSON,
  };
});

import StorePublicPage from '../StorePublicPage';

describe('StorePublicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOnChainStore.mockReset();
    mockGetPublicJSON.mockReset();
  });

  it('renders store metadata and catalog items', async () => {
    mockFetchOnChainStore.mockResolvedValue({
      payload: {
        storeId: '123',
        owner: '5F3sa2TJAWMqDhXG6jhV4N8ko9aCEHu9oqpe6yQ5aEeezyYb',
        operators: ['5HFooBarBaz123456789012345678901234567890123'],
        reputation: { sales: 3, positive: 3, negative: 0, volumePlanck: '1000' },
        cid: 'bafyMockCid',
        metadata: {},
        source: 'stores',
      },
      metadata: {
        name: 'Loja Teste',
        description: 'Descrição da loja',
        categories: [['products', 'artes']],
        links: [],
        theme: undefined,
        raw: {},
      },
    });

    mockGetPublicJSON.mockImplementation((url: string) => {
      if (url.startsWith('/search')) {
        return Promise.resolve({
          items: [
            {
              id: 'prod-1',
              title: 'Produto Alpha',
              kind: 'product',
              priceBzr: '10.50',
              description: 'Produto incrível',
              categoryPath: ['produtos', 'alpha'],
            },
          ],
          page: { total: 1, limit: 24, offset: 0 },
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });

    render(
      <MemoryRouter initialEntries={["/loja/123"]}>
        <Routes>
          <Route path="/loja/:id" element={<StorePublicPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Loja Teste')).toBeInTheDocument();
    });

    expect(screen.getByText('Produto Alpha')).toBeInTheDocument();
    expect(screen.getByText('Descrição da loja')).toBeInTheDocument();
  });
});
