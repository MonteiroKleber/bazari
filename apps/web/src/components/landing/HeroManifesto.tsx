import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Coins, ChevronDown } from 'lucide-react';

interface HeroManifestoProps {
  onScrollToAuth?: () => void;
}

export function HeroManifesto({ onScrollToAuth }: HeroManifestoProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative py-24 md:py-32 lg:py-40 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-bold">
              {t('hero.badge', { defaultValue: '🔥 NOVA ECONOMIA DESCENTRALIZADA' })}
            </span>
          </div>

          <div className="mb-3 text-xs md:text-sm text-muted-foreground font-medium tracking-wider">
            {t('hero.badgeSubtitle', { defaultValue: 'Blockchain • BZR • Imparável' })}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              {t('hero.title', { defaultValue: 'BAZARI: A Moeda do Povo.' })}
            </span>
            <br />
            <span className="text-foreground">
              {t('hero.titleLine2', { defaultValue: 'Sem Fronteiras.' })}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            {t('hero.subtitle', {
              defaultValue: 'Não somos apenas um marketplace. Somos uma nova economia onde você tem soberania total sobre seu dinheiro, sua loja e seu futuro. Imparável.'
            })}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button
              size="lg"
              className="group bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg shadow-primary/30 min-w-[200px]"
              onClick={() => navigate('/search?sort=relevance')}
            >
              🛍️ {t('hero.cta_primary', { defaultValue: 'Explorar Marketplace' })}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="group border-2 border-primary/50 hover:bg-primary/10 min-w-[200px]"
              onClick={() => navigate('/app/p2p')}
            >
              <Coins className="mr-2 h-5 w-5 text-secondary" />
              {t('hero.cta_secondary', { defaultValue: 'Comprar BZR' })}
            </Button>
          </div>

          {/* Tertiary CTA */}
          <button
            onClick={onScrollToAuth}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 mx-auto group"
          >
            {t('hero.cta_tertiary', { defaultValue: 'Já tem conta? Criar sua loja tokenizada' })}
            <ChevronDown className="h-4 w-4 animate-bounce group-hover:animate-none" />
          </button>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Gradient blobs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      </div>
    </section>
  );
}
