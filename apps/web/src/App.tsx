// path: apps/web/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { Header } from './components/Header';
import { AppHeader } from './components/AppHeader';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Roadmap } from './components/Roadmap';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';
import { ThemeGallery } from './components/ThemeGallery';
import { DevPanel } from './components/DevPanel';
import { SearchPage } from './pages/SearchPage';
import { NewListingPage } from './pages/NewListingPage';

function LandingPage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Features />
        <Roadmap />
        
        {/* Theme Gallery Section (opcional - pode remover em produção) */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                Temas Disponíveis
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                Escolha o tema que mais combina com você
              </p>
              <ThemeGallery />
            </div>
          </div>
        </section>
        
        <CTASection />
      </main>
      <Footer />
      
      {/* DevPanel - apenas em desenvolvimento */}
      {import.meta.env.DEV && <DevPanel />}
    </>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/search" element={<SearchPage />} />
            
            {/* Rotas internas/autenticadas */}
            <Route path="/app/*" element={
              <AppLayout>
                <Routes>
                  <Route path="new" element={<NewListingPage />} />
                  {/* Futuras rotas internas */}
                  {/* <Route path="dashboard" element={<Dashboard />} /> */}
                  {/* <Route path="wallet" element={<Wallet />} /> */}
                  {/* <Route path="dao" element={<DAO />} /> */}
                </Routes>
              </AppLayout>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;