import { ThemeProvider } from './theme/ThemeProvider'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { Features } from './components/Features'
import { Roadmap } from './components/Roadmap'
import { CTASection } from './components/CTASection'
import { Footer } from './components/Footer'
import { ThemeGallery } from './components/ThemeGallery'
import { DevPanel } from './components/DevPanel'

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
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
      </div>
    </ThemeProvider>
  )
}

export default App