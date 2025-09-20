import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';

interface CTASectionProps {
  onPrimaryClick?: () => void;
}

export function CTASection({ onPrimaryClick }: CTASectionProps) {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-gradient-to-r from-primary/10 to-secondary/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex p-3 rounded-full bg-background mb-6">
            <Sparkles className="h-8 w-8 text-secondary" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            {t('cta.subtitle')}
          </p>
          
          <Button size="lg" className="animate-pulse" onClick={() => onPrimaryClick?.()}>
            {t('cta.button')}
          </Button>
        </div>
      </div>
    </section>
  );
}
