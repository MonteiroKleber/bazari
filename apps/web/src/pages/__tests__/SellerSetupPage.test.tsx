import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import type { SellerProfileDto } from '@/modules/seller/api';

function createFeatureFlagDefaults() {
  return {
    store_onchain_v1: true,
    store_branded_v1: false,
    store_ux_v2: false,
  } as const;
}

let configModule: typeof import('@/config');

const mockSellerApi = vi.hoisted(() => ({
  getMe: vi.fn(),
  getMyStore: vi.fn(),
  createStore: vi.fn(),
  updateMyStore: vi.fn(),
}));

const onchainMocks = vi.hoisted(() => ({
  buildStoreMetadata: vi.fn(),
  uploadMetadataToIpfs: vi.fn(),
  fetchOnChainStore: vi.fn(),
  getCreationDeposit: vi.fn(),
  getPendingTransfer: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

const mockPinService = vi.hoisted(() => ({
  getPin: vi.fn(async (config?: { validate?: (pin: string) => Promise<string | null> | string | null }) => {
    if (config?.validate) {
      const validation = await config.validate('1234');
      if (validation) {
        throw new Error(validation);
      }
    }
    return '1234';
  }),
}));

const mockAuth = vi.hoisted(() => ({
  getActiveAccount: vi.fn(),
  decryptMnemonic: vi.fn(),
  subscribeVault: vi.fn(() => () => {}),
}));

const mockWallet = vi.hoisted(() => ({
  getChainProps: vi.fn(),
  getApi: vi.fn(),
}));

const mockPair = vi.hoisted(() => ({ lock: vi.fn() }));

const mockKeyringFactory = vi.hoisted(() => vi.fn());

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: Record<string, any>) => opts?.defaultValue ?? _key,
  }),
}));

vi.mock('@/config', () => {
  const flags = { ...createFeatureFlagDefaults() };
  return { FEATURE_FLAGS: flags };
});

vi.mock('@/modules/seller/api', () => ({ sellerApi: mockSellerApi }));

vi.mock('@/modules/store/onchain', async () => {
  const actual = await vi.importActual<any>('@/modules/store/onchain');
  const mocks = onchainMocks;
  return {
    ...actual,
    buildStoreMetadata: mocks.buildStoreMetadata,
    uploadMetadataToIpfs: mocks.uploadMetadataToIpfs,
    fetchOnChainStore: mocks.fetchOnChainStore,
    getCreationDeposit: mocks.getCreationDeposit,
    getPendingTransfer: mocks.getPendingTransfer,
  };
});

vi.mock('sonner', () => ({ toast: mockToast }));

vi.mock('@/modules/wallet/pin/PinService', () => ({ PinService: mockPinService }));

vi.mock('@/modules/auth', () => ({
  getActiveAccount: mockAuth.getActiveAccount,
  decryptMnemonic: mockAuth.decryptMnemonic,
  subscribeVault: mockAuth.subscribeVault,
}));

vi.mock('@/modules/wallet/services/polkadot', () => ({
  getChainProps: mockWallet.getChainProps,
  getApi: mockWallet.getApi,
}));

vi.mock('@polkadot/keyring', () => ({
  Keyring: class {
    constructor(...args: any[]) {
      mockKeyringFactory(...args);
    }
    addFromMnemonic() {
      return mockPair;
    }
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import SellerSetupPage from '../SellerSetupPage';

describe('SellerSetupPage', () => {
  beforeAll(async () => {
    configModule = await import('@/config');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(configModule.FEATURE_FLAGS, createFeatureFlagDefaults());
    mockSellerApi.getMe.mockReset();
    mockSellerApi.getMyStore.mockReset();
    mockSellerApi.createStore.mockReset();
    mockSellerApi.updateMyStore.mockReset();

    onchainMocks.buildStoreMetadata.mockReset();
    onchainMocks.uploadMetadataToIpfs.mockReset();
    onchainMocks.fetchOnChainStore.mockReset();
    onchainMocks.getCreationDeposit.mockReset();
    onchainMocks.getPendingTransfer.mockReset();

    mockToast.success.mockReset();
    mockToast.error.mockReset();

    mockPinService.getPin.mockReset();
    mockPinService.getPin.mockImplementation(async (config?: { validate?: (pin: string) => Promise<string | null> | string | null }) => {
      if (config?.validate) {
        const validation = await config.validate('1234');
        if (validation) {
          throw new Error(validation);
        }
      }
      return '1234';
    });

    mockAuth.getActiveAccount.mockReset();
    mockAuth.decryptMnemonic.mockReset();
    mockAuth.subscribeVault.mockReset();

    mockWallet.getChainProps.mockReset();
    mockWallet.getApi.mockReset();

    mockPair.lock.mockReset();
    mockKeyringFactory.mockReset();

    mockNavigate.mockReset();

    mockSellerApi.getMe.mockResolvedValue({ sellerProfile: null });
    mockSellerApi.getMyStore.mockResolvedValue({ sellerProfile: null });
    onchainMocks.getCreationDeposit.mockResolvedValue(0n);
    onchainMocks.getPendingTransfer.mockResolvedValue(null);
    mockAuth.getActiveAccount.mockResolvedValue({
      id: 'acc-1',
      address: '5F3sa2TJAWMqDhXG6jhV4N8ko9aCEHu9oqpe6yQ5aEeezyYb',
      cipher: 'cipher',
      iv: 'iv',
      salt: 'salt',
      iterations: 1,
      createdAt: new Date().toISOString(),
      version: 1,
    });
    mockAuth.decryptMnemonic.mockResolvedValue('seed phrase');
    mockWallet.getChainProps.mockResolvedValue({ ss58Prefix: 42, tokenDecimals: 12, tokenSymbol: 'BZR' });

    mockWallet.getApi.mockResolvedValue({
      tx: {
        stores: {
          createStore: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({
                status: { isFinalized: true },
                dispatchError: null,
                events: [
                  {
                    event: {
                      section: 'stores',
                      method: 'StoreCreated',
                      data: [null, { toString: () => '99' }, null],
                    },
                  },
                ],
              });
              return Promise.resolve(() => {});
            },
          })),
          updateMetadata: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({ status: { isFinalized: true }, dispatchError: null, events: [] });
              return Promise.resolve(() => {});
            },
          })),
          addOperator: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({ status: { isFinalized: true }, dispatchError: null, events: [] });
              return Promise.resolve(() => {});
            },
          })),
          removeOperator: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({ status: { isFinalized: true }, dispatchError: null, events: [] });
              return Promise.resolve(() => {});
            },
          })),
          beginTransfer: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({ status: { isFinalized: true }, dispatchError: null, events: [] });
              return Promise.resolve(() => {});
            },
          })),
          acceptTransfer: vi.fn(() => ({
            signAndSend: (_pair: unknown, cb: (result: any) => void) => {
              cb({ status: { isFinalized: true }, dispatchError: null, events: [] });
              return Promise.resolve(() => {});
            },
          })),
        },
      },
      registry: {
        findMetaError: () => ({ section: 'mock', name: 'MockError' }),
      },
    });

    onchainMocks.fetchOnChainStore.mockResolvedValue({
      payload: {
        storeId: '99',
        owner: '5F3sa2TJAWMqDhXG6jhV4N8ko9aCEHu9oqpe6yQ5aEeezyYb',
        operators: [],
        reputation: { sales: 0, positive: 0, negative: 0, volumePlanck: '0' },
        cid: 'cidMock',
        metadata: {},
        source: 'stores',
      },
      metadata: {
        name: 'Loja OnChain',
        description: '',
        categories: [],
        links: [],
        theme: undefined,
        raw: {},
      },
    });

    onchainMocks.buildStoreMetadata.mockReturnValue({ version: '1.0.0', name: 'Loja', categories: ['products:teste'] });
    onchainMocks.uploadMetadataToIpfs.mockResolvedValue('cid123');
    mockSellerApi.createStore.mockResolvedValue({
      sellerProfile: {
        id: 'store-1',
        shopSlug: 'minha-loja',
        shopName: 'Minha Loja',
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
    mockSellerApi.updateMyStore.mockResolvedValue({
      sellerProfile: {
        id: 'store-1',
        shopSlug: 'minha-loja',
        shopName: 'Minha Loja',
        ratingAvg: 0,
        ratingCount: 0,
      },
    });
  });

  it('submits off-chain flow when feature flag disabled', async () => {
    configModule.FEATURE_FLAGS.store_onchain_v1 = false;

    render(
      <MemoryRouter initialEntries={["/app/seller/setup"]}>
        <Routes>
          <Route path="/app/seller/setup" element={<SellerSetupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockSellerApi.getMyStore).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('seller.form.shopName'), { target: { value: 'Loja Beta' } });
    fireEvent.change(screen.getByLabelText('seller.form.shopSlug'), { target: { value: 'loja-beta' } });
    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => {
      expect(mockSellerApi.createStore).toHaveBeenCalledWith({ shopName: 'Loja Beta', shopSlug: 'loja-beta', about: undefined });
    });
  });

  it('performs on-chain creation flow', async () => {
    render(
      <MemoryRouter initialEntries={["/app/seller/setup"]}>
        <Routes>
          <Route path="/app/seller/setup" element={<SellerSetupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mockSellerApi.getMyStore).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('seller.form.shopName'), { target: { value: 'Minha Loja' } });
    fireEvent.change(screen.getByLabelText('seller.form.shopSlug'), { target: { value: 'minha-loja' } });
    fireEvent.change(screen.getByLabelText('seller.form.about'), { target: { value: 'Descrição' } });

    fireEvent.change(screen.getByPlaceholderText('products/tecnologia'), { target: { value: 'products/teste' } });
    fireEvent.click(screen.getByText('Adicionar'));

    fireEvent.click(screen.getByText('Publicar loja on-chain'));

    await waitFor(() => {
      expect(onchainMocks.uploadMetadataToIpfs).toHaveBeenCalled();
      expect(mockSellerApi.createStore).toHaveBeenCalled();
    });

    const payload = mockSellerApi.createStore.mock.calls[0][0];
    expect(payload).toMatchObject({ onChainStoreId: '99', shopSlug: 'minha-loja' });
    expect(mockNavigate).toHaveBeenCalledWith('/seller/minha-loja');
  });

  it('loads store data when editing via query parameter', async () => {
    mockSellerApi.getMyStore.mockResolvedValueOnce({
      sellerProfile: {
        id: 'store-123',
        shopName: 'Loja 123',
        shopSlug: 'loja-123',
        about: 'Loja teste',
        policies: null,
        ratingAvg: 0,
        ratingCount: 0,
        onChainStoreId: '42',
      } as SellerProfileDto,
    });

    render(
      <MemoryRouter initialEntries={["/app/seller/setup?store=store-123"]}>
        <Routes>
          <Route path="/app/seller/setup" element={<SellerSetupPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockSellerApi.getMyStore).toHaveBeenCalledWith('store-123');
    });

    expect(screen.getByDisplayValue('Loja 123')).toBeInTheDocument();
    expect(screen.getByDisplayValue('loja-123')).toBeInTheDocument();
  });
});
