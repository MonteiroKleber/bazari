// FASE 11 - PROMPT 1: E2E Tests - Test Data
// Constants and test data for E2E tests

/**
 * Test seed phrases (from Substrate development accounts)
 * These are INSECURE accounts for testing only - NEVER use in production
 */
export const TEST_SEEDS = {
  alice: 'bottom drive obey lake curtain smoke basket hold race lonely fit walk',
  bob: 'clip organ olive upper oak void inject side suit toilet stick narrow',
  charlie: 'guard cream sadness conduct invite crumble clock pudding hole grit liar hotel',
  dave: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
} as const;

/**
 * Test account addresses (Substrate development accounts)
 */
export const TEST_ADDRESSES = {
  alice: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  bob: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  charlie: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
  dave: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
} as const;

/**
 * Test account handles
 */
export const TEST_HANDLES = {
  alice: 'alice_test',
  bob: 'bob_test',
  charlie: 'charlie_test',
  dave: 'dave_test',
} as const;

/**
 * Test account names
 */
export const TEST_NAMES = {
  alice: 'Alice Test',
  bob: 'Bob Test',
  charlie: 'Charlie Test',
  dave: 'Dave Test',
} as const;

/**
 * Default test PIN
 */
export const TEST_PIN = '123456';

/**
 * Test product data
 */
export const TEST_PRODUCTS = {
  smartphone: {
    name: 'Smartphone Test XYZ',
    description: 'Test smartphone for E2E tests',
    price: '500.00',
    category: 'Electronics',
    attributes: [
      { key: 'Brand', value: 'TestBrand' },
      { key: 'Color', value: 'Black' },
      { key: 'Storage', value: '128GB' },
    ],
  },
  laptop: {
    name: 'Laptop Test Pro',
    description: 'Test laptop for E2E tests',
    price: '1200.00',
    category: 'Electronics',
    attributes: [
      { key: 'Brand', value: 'TestBrand' },
      { key: 'RAM', value: '16GB' },
      { key: 'Processor', value: 'i7' },
    ],
  },
  tshirt: {
    name: 'T-Shirt Test',
    description: 'Test clothing item',
    price: '25.00',
    category: 'Clothing',
    attributes: [
      { key: 'Size', value: 'M' },
      { key: 'Color', value: 'Blue' },
      { key: 'Material', value: 'Cotton' },
    ],
  },
} as const;

/**
 * Test service data
 */
export const TEST_SERVICES = {
  delivery: {
    name: 'Express Delivery Test',
    description: 'Fast delivery service for testing',
    price: '10.00',
    category: 'Delivery',
  },
  consulting: {
    name: 'Tech Consulting Test',
    description: 'Technical consulting service',
    price: '100.00',
    category: 'Consulting',
  },
} as const;

/**
 * Test P2P offer data
 */
export const TEST_P2P_OFFERS = {
  sell_zari: {
    amount: '100.00',
    price_per_unit: '1.50',
    payment_method: 'Bank Transfer',
    min_order: '10.00',
    max_order: '50.00',
  },
  buy_zari: {
    amount: '50.00',
    price_per_unit: '1.45',
    payment_method: 'PIX',
    min_order: '5.00',
    max_order: '25.00',
  },
} as const;

/**
 * Test delivery data
 */
export const TEST_DELIVERIES = {
  standard: {
    pickup_address: 'Rua Test, 123 - Centro',
    delivery_address: 'Av Test, 456 - Bairro',
    package_size: 'small',
    notes: 'Leave at door',
  },
  express: {
    pickup_address: 'Rua Express, 789 - Norte',
    delivery_address: 'Av Express, 012 - Sul',
    package_size: 'medium',
    notes: 'Fragile - handle with care',
  },
} as const;

/**
 * Test chat messages
 */
export const TEST_CHAT_MESSAGES = {
  greeting: 'Hello! I am interested in this item.',
  question: 'Is this still available?',
  negotiation: 'Can you do 10% discount for bulk order?',
  confirmation: 'Great! I will proceed with the purchase.',
} as const;

/**
 * Test vesting categories
 */
export const VESTING_CATEGORIES = [
  'Founders',
  'Team',
  'Partners',
  'Marketing',
] as const;

/**
 * Test governance proposal data
 */
export const TEST_PROPOSALS = {
  simple: {
    title: 'Test Proposal - Simple',
    description: 'A simple test proposal for E2E testing',
    type: 'text',
  },
  complex: {
    title: 'Test Proposal - Treasury Spend',
    description: 'Request treasury spend for development',
    type: 'treasury',
    amount: '1000.00',
    beneficiary: TEST_ADDRESSES.alice,
  },
} as const;

/**
 * Timeout values (in milliseconds)
 */
export const TIMEOUTS = {
  short: 5000, // 5 seconds
  medium: 10000, // 10 seconds
  long: 30000, // 30 seconds
  blockchain: 60000, // 1 minute (for blockchain operations)
} as const;

/**
 * API endpoints for testing
 */
export const API_ENDPOINTS = {
  vesting: {
    stats: '/vesting/stats',
    accounts: '/vesting/accounts',
    schedule: (address: string) => `/vesting/schedule/${address}`,
  },
  governance: {
    proposals: '/governance/proposals',
    proposal: (id: number) => `/governance/proposals/${id}`,
    vote: (id: number) => `/governance/proposals/${id}/vote`,
  },
  products: {
    search: '/products/search',
    list: '/products',
    detail: (slug: string) => `/products/${slug}`,
  },
  services: {
    search: '/services/search',
    list: '/services',
    detail: (slug: string) => `/services/${slug}`,
  },
  p2p: {
    offers: '/p2p/offers',
    offer: (id: string) => `/p2p/offers/${id}`,
    accept: (id: string) => `/p2p/offers/${id}/accept`,
  },
  delivery: {
    requests: '/delivery/requests',
    request: (id: string) => `/delivery/requests/${id}`,
    accept: (id: string) => `/delivery/requests/${id}/accept`,
    complete: (id: string) => `/delivery/requests/${id}/complete`,
  },
  orders: {
    list: '/orders',
    order: (id: string) => `/orders/${id}`,
    create: '/orders',
  },
  auth: {
    me: '/auth/me',
  },
} as const;
