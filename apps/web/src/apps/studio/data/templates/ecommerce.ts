/**
 * E-commerce Template
 * Loja virtual com carrinho, produtos e checkout
 */

import type { Template } from '../../types/studio.types';

export const ecommerceTemplate: Template = {
  id: 'ecommerce',
  name: 'E-commerce Starter',
  description: 'Loja virtual com carrinho, produtos e checkout integrado com BZR.',
  category: 'commerce',
  icon: 'Store',
  color: '#10B981',
  tags: ['ecommerce', 'shop', 'cart', 'checkout', 'payments'],
  sdkFeatures: ['auth', 'wallet', 'transfer', 'storage'],
  defaultPermissions: [
    { id: 'auth:read', reason: 'Para identificar o comprador' },
    { id: 'wallet:read', reason: 'Para verificar saldo disponivel' },
    { id: 'wallet:transfer', reason: 'Para processar pagamentos' },
    { id: 'storage:read', reason: 'Para salvar carrinho de compras' },
    { id: 'ui:toast', reason: 'Para exibir notificações' },
  ],
  files: [
    {
      path: 'package.json',
      isTemplate: true,
      content: `{
  "name": "{{slug}}",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "{{description}}",
  "author": "{{author}}",
  "scripts": {
    "dev": "vite --port 3333 --host",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bazari.libervia.xyz/app-sdk": "^0.2.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}`,
    },
    {
      path: 'bazari.manifest.json',
      isTemplate: true,
      content: `{
  "appId": "com.bazari.{{slug}}",
  "name": "{{name}}",
  "slug": "{{slug}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "author": "{{author}}",
  "category": "commerce",
  "permissions": [
    { "id": "auth:read", "reason": "Para identificar o comprador" },
    { "id": "wallet:read", "reason": "Para verificar saldo disponivel" },
    { "id": "wallet:transfer", "reason": "Para processar pagamentos" },
    { "id": "storage:read", "reason": "Para salvar carrinho de compras" },
    { "id": "ui:toast", "reason": "Para exibir notificações" }
  ],
  "sdkVersion": "0.2.0",
  "entryPoint": "dist/index.html",
  "icon": "Store",
  "color": "from-emerald-500 to-green-600"
}`,
    },
    {
      path: 'index.html',
      isTemplate: true,
      content: `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{name}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./src/main.tsx"></script>
  </body>
</html>`,
    },
    {
      path: 'vite.config.ts',
      isTemplate: false,
      content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 3333, host: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
    assetsDir: 'assets',
  },
});`,
    },
    {
      path: 'tsconfig.json',
      isTemplate: false,
      content: `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,
    },
    {
      path: 'tsconfig.node.json',
      isTemplate: false,
      content: `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}`,
    },
    {
      path: 'src/main.tsx',
      isTemplate: false,
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);`,
    },
    {
      path: 'src/App.tsx',
      isTemplate: true,
      content: `import { Routes, Route } from 'react-router-dom';
import { useBazari } from './hooks/useBazari';
import { CartProvider } from './hooks/useCart';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';

function App() {
  const { isInBazari, isLoading } = useBazari();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Carregando {{name}}...</p>
      </div>
    );
  }

  if (!isInBazari) {
    return (
      <div className="dev-warning">
        <h1>{{name}}</h1>
        <p>Este app deve rodar dentro do Bazari.</p>
        <p>Use o Preview Mode no Developer Portal.</p>
      </div>
    );
  }

  return (
    <CartProvider>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  );
}

export default App;`,
    },
    {
      path: 'src/hooks/useBazari.ts',
      isTemplate: false,
      content: `import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { BazariSDK, SDKUser } from '@bazari.libervia.xyz/app-sdk';

interface BazariContextType {
  sdk: BazariSDK | null;
  user: SDKUser | null;
  balance: string;
  isLoading: boolean;
  isInBazari: boolean;
  transfer: (to: string, amount: string) => Promise<boolean>;
}

const BazariContext = createContext<BazariContextType | null>(null);

export function useBazari(): BazariContextType {
  const [sdk, setSdk] = useState<BazariSDK | null>(null);
  const [user, setUser] = useState<SDKUser | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isInBazari, setIsInBazari] = useState(false);

  useEffect(() => {
    const init = async () => {
      const sdkInstance = new BazariSDK({ debug: true });
      setSdk(sdkInstance);

      const inBazari = sdkInstance.isInBazari();
      setIsInBazari(inBazari);

      if (inBazari) {
        const currentUser = await sdkInstance.auth.getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const balances = await sdkInstance.wallet.getBalance();
          setBalance(balances?.formatted?.bzr || '0');
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const transfer = useCallback(async (to: string, amount: string) => {
    if (!sdk) return false;
    try {
      await sdk.wallet.requestTransfer({ to, amount: parseFloat(amount), token: 'BZR' });
      return true;
    } catch {
      return false;
    }
  }, [sdk]);

  return { sdk, user, balance, isLoading, isInBazari, transfer };
}`,
    },
    {
      path: 'src/hooks/useCart.tsx',
      isTemplate: false,
      content: `import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
}`,
    },
    {
      path: 'src/pages/HomePage.tsx',
      isTemplate: true,
      content: `import { ProductCard } from '../components/ProductCard';

// Sample products - replace with your actual data
const PRODUCTS = [
  { id: '1', name: 'Produto Premium', price: 99.90, image: '🎁', description: 'Produto de alta qualidade' },
  { id: '2', name: 'Produto Standard', price: 49.90, image: '📦', description: 'Otimo custo-beneficio' },
  { id: '3', name: 'Produto Basic', price: 29.90, image: '🛍️', description: 'Ideal para comecar' },
  { id: '4', name: 'Produto Exclusive', price: 199.90, image: '✨', description: 'Edicao limitada' },
];

export function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Bem-vindo a {{name}}</h1>
        <p>{{description}}</p>
      </section>

      <section className="products-section">
        <h2>Nossos Produtos</h2>
        <div className="products-grid">
          {PRODUCTS.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}`,
    },
    {
      path: 'src/pages/ProductPage.tsx',
      isTemplate: false,
      content: `import { useParams, Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

const PRODUCTS: Record<string, { name: string; price: number; image: string; description: string }> = {
  '1': { name: 'Produto Premium', price: 99.90, image: '🎁', description: 'Produto de alta qualidade com materiais selecionados.' },
  '2': { name: 'Produto Standard', price: 49.90, image: '📦', description: 'Otimo custo-beneficio para o dia a dia.' },
  '3': { name: 'Produto Basic', price: 29.90, image: '🛍️', description: 'Ideal para quem esta comecando.' },
  '4': { name: 'Produto Exclusive', price: 199.90, image: '✨', description: 'Edicao limitada com design exclusivo.' },
};

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const product = id ? PRODUCTS[id] : null;

  if (!product) {
    return (
      <div className="not-found">
        <h1>Produto nao encontrado</h1>
        <Link to="/">Voltar para loja</Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem({ id: id!, ...product });
  };

  return (
    <div className="product-page">
      <Link to="/" className="back-link">← Voltar</Link>

      <div className="product-detail">
        <div className="product-image-large">{product.image}</div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <p className="product-description">{product.description}</p>
          <p className="product-price">{product.price.toFixed(2)} BZR</p>
          <button className="btn-add-cart" onClick={handleAddToCart}>
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/pages/CartPage.tsx',
      isTemplate: false,
      content: `import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useBazari } from '../hooks/useBazari';

export function CartPage() {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { transfer, balance } = useBazari();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCheckout = async () => {
    setProcessing(true);
    // In production, use your store's wallet address
    const storeWallet = 'YOUR_STORE_WALLET_ADDRESS';
    const result = await transfer(storeWallet, total.toFixed(2));

    if (result) {
      setSuccess(true);
      clearCart();
    }
    setProcessing(false);
  };

  if (success) {
    return (
      <div className="checkout-success">
        <h1>Pedido Confirmado!</h1>
        <p>Obrigado pela sua compra.</p>
        <Link to="/" className="btn-continue">Continuar Comprando</Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-cart">
        <h1>Carrinho Vazio</h1>
        <p>Adicione produtos ao seu carrinho</p>
        <Link to="/" className="btn-continue">Ver Produtos</Link>
      </div>
    );
  }

  const hasBalance = parseFloat(balance) >= total;

  return (
    <div className="cart-page">
      <h1>Seu Carrinho</h1>

      <div className="cart-items">
        {items.map(item => (
          <div key={item.id} className="cart-item">
            <span className="item-image">{item.image}</span>
            <div className="item-details">
              <h3>{item.name}</h3>
              <p>{item.price.toFixed(2)} BZR</p>
            </div>
            <div className="item-quantity">
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
              <span>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
            </div>
            <button className="btn-remove" onClick={() => removeItem(item.id)}>X</button>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Total:</span>
          <span className="total-value">{total.toFixed(2)} BZR</span>
        </div>
        <div className="summary-row balance">
          <span>Seu saldo:</span>
          <span>{balance} BZR</span>
        </div>

        <button
          className="btn-checkout"
          onClick={handleCheckout}
          disabled={processing || !hasBalance}
        >
          {processing ? 'Processando...' : !hasBalance ? 'Saldo Insuficiente' : 'Finalizar Compra'}
        </button>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/components/Header.tsx',
      isTemplate: true,
      content: `import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useBazari } from '../hooks/useBazari';

export function Header() {
  const { itemCount } = useCart();
  const { balance, user } = useBazari();

  return (
    <header className="header">
      <Link to="/" className="logo">{{name}}</Link>

      <div className="header-right">
        {user && (
          <span className="user-balance">{balance} BZR</span>
        )}
        <Link to="/cart" className="cart-link">
          🛒 {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
        </Link>
      </div>
    </header>
  );
}`,
    },
    {
      path: 'src/components/ProductCard.tsx',
      isTemplate: false,
      content: `import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
}

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="product-card">
      <Link to={\`/product/\${product.id}\`} className="product-link">
        <div className="product-image">{product.image}</div>
        <h3 className="product-name">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
      </Link>
      <div className="product-footer">
        <span className="product-price">{product.price.toFixed(2)} BZR</span>
        <button
          className="btn-add"
          onClick={(e) => { e.preventDefault(); addItem(product); }}
        >
          + Carrinho
        </button>
      </div>
    </div>
  );
}`,
    },
    {
      path: 'src/index.css',
      isTemplate: false,
      content: `* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
}

.loading-screen, .dev-warning {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin { to { transform: rotate(360deg); } }

.app { min-height: 100vh; }

.header {
  background: white;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #10b981;
  text-decoration: none;
}

.header-right { display: flex; align-items: center; gap: 16px; }

.user-balance {
  font-weight: 600;
  color: #10b981;
}

.cart-link {
  font-size: 20px;
  text-decoration: none;
  position: relative;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
}

.main-content { padding: 24px; max-width: 1200px; margin: 0 auto; }

.hero {
  text-align: center;
  padding: 48px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 16px;
  margin-bottom: 32px;
}

.hero h1 { font-size: 32px; margin-bottom: 8px; }

.products-section h2 {
  font-size: 24px;
  margin-bottom: 24px;
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.product-card:hover { transform: translateY(-4px); }

.product-link { text-decoration: none; color: inherit; }

.product-image {
  font-size: 64px;
  text-align: center;
  padding: 32px;
  background: #f9fafb;
}

.product-name {
  padding: 16px 16px 8px;
  font-size: 18px;
}

.product-desc {
  padding: 0 16px;
  font-size: 14px;
  color: #666;
}

.product-footer {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-price {
  font-size: 18px;
  font-weight: 700;
  color: #10b981;
}

.btn-add {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-add:hover { background: #059669; }

/* Cart Page */
.cart-page, .empty-cart, .checkout-success {
  max-width: 600px;
  margin: 0 auto;
}

.cart-page h1, .empty-cart h1, .checkout-success h1 {
  margin-bottom: 24px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
  margin-bottom: 12px;
}

.item-image { font-size: 32px; }

.item-details { flex: 1; }
.item-details h3 { font-size: 16px; }
.item-details p { color: #10b981; font-weight: 600; }

.item-quantity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-quantity button {
  width: 28px;
  height: 28px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.btn-remove {
  background: #ef4444;
  color: white;
  border: none;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
}

.cart-summary {
  background: white;
  padding: 24px;
  border-radius: 12px;
  margin-top: 24px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.summary-row.balance { color: #666; font-size: 14px; }

.total-value { font-size: 24px; font-weight: 700; color: #10b981; }

.btn-checkout, .btn-continue {
  width: 100%;
  padding: 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
  text-decoration: none;
  display: block;
  text-align: center;
}

.btn-checkout:disabled { background: #ccc; cursor: not-allowed; }

/* Product Detail */
.product-page { max-width: 800px; margin: 0 auto; }

.back-link {
  color: #10b981;
  text-decoration: none;
  margin-bottom: 24px;
  display: inline-block;
}

.product-detail {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  background: white;
  padding: 32px;
  border-radius: 16px;
}

.product-image-large {
  font-size: 120px;
  text-align: center;
  background: #f9fafb;
  border-radius: 12px;
  padding: 48px;
}

.product-info h1 { margin-bottom: 16px; }
.product-description { color: #666; margin-bottom: 24px; }
.product-price { font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 24px; }

.btn-add-cart {
  width: 100%;
  padding: 16px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-add-cart:hover { background: #059669; }

@media (max-width: 768px) {
  .product-detail { grid-template-columns: 1fr; }
}`,
    },
    {
      path: '.gitignore',
      isTemplate: false,
      content: `node_modules/
dist/
.env
.bazari/
*.log`,
    },
  ],
};
