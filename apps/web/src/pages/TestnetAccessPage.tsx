import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Users,
  Shield,
  Lightbulb,
  Scale,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function TestnetAccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const renderHero = () => (
    <section className="relative py-20 md:py-32 lg:py-40 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto text-center">
          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm font-bold text-primary">
              {t('testnet.hero.badge')}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {t('testnet.hero.title')}
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            {t('testnet.hero.subtitle')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="group shadow-lg"
              onClick={() => window.open('https://bazari.libervia.xyz/', '_blank')}
            >
              <Globe className="mr-2 h-5 w-5" />
              {t('testnet.hero.accessApp')}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2"
              onClick={() => window.open('https://bazari.libervia.xyz/doc/pt/index.html', '_blank')}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              {t('testnet.hero.viewDocs')}
            </Button>
          </div>
        </div>
      </div>

      {/* Floating blob background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>
    </section>
  );

  const renderWarning = () => (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Alert className="border-2 border-primary/30 bg-card">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <AlertDescription className="ml-2">
              <h3 className="text-lg font-bold mb-2 text-foreground">
                {t('testnet.warning.title')}
              </h3>
              <p className="text-muted-foreground">
                {t('testnet.warning.description')}
              </p>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </section>
  );

  const renderPurpose = () => (
    <section className="py-20 md:py-28 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-4">
              <MessageCircle className="h-4 w-4 text-secondary" />
              <span className="text-sm font-bold text-secondary">
                {t('testnet.purpose.badge')}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {t('testnet.purpose.title')}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('testnet.purpose.subtitle')}
            </p>
          </div>

          {/* Purpose Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-primary/20 hover:border-primary/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                  <Users className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('testnet.purpose.cards.transparency.title')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('testnet.purpose.cards.transparency.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-secondary/20 hover:border-secondary/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-secondary to-accent mb-4">
                  <Lightbulb className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('testnet.purpose.cards.innovation.title')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('testnet.purpose.cards.innovation.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/20 hover:border-accent/30 hover:shadow-lg transition-all">
              <CardContent className="pt-6 text-center">
                <div className="inline-flex p-4 rounded-full bg-gradient-to-br from-accent to-primary mb-4">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {t('testnet.purpose.cards.engagement.title')}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t('testnet.purpose.cards.engagement.description')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );

  const renderLegalDisclaimer = () => (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 border border-destructive/20 mb-4">
              <Scale className="h-4 w-4 text-destructive" />
              <span className="text-sm font-bold text-destructive">
                {t('testnet.legal.badge')}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('testnet.legal.title')}
            </h2>
          </div>

          {/* Legal Points */}
          <Card className="border-2 border-muted">
            <CardContent className="pt-6">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-muted-foreground">
                    {t('testnet.legal.points.notFinal')}
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-muted-foreground">
                    {t('testnet.legal.points.noRealTransactions')}
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-muted-foreground">
                    {t('testnet.legal.points.risks')}
                  </p>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                  </div>
                  <p className="text-muted-foreground">
                    {t('testnet.legal.points.updates')}
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  const renderStrategicMessage = () => (
    <section className="py-20 md:py-28 bg-gradient-to-br from-secondary/5 via-transparent to-primary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Section Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-accent">
                {t('testnet.strategic.badge')}
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              {t('testnet.strategic.title')}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('testnet.strategic.subtitle')}
            </p>
          </div>

          {/* Strategic Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('testnet.strategic.points.maturity.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('testnet.strategic.points.maturity.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('testnet.strategic.points.transparency.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('testnet.strategic.points.transparency.description')}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('testnet.strategic.points.engagement.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('testnet.strategic.points.engagement.description')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Final Message */}
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
            <CardContent className="pt-6">
              <p className="text-center text-lg leading-relaxed">
                {t('testnet.strategic.finalMessage')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  const renderFinalCTA = () => (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {t('testnet.cta.title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('testnet.cta.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="group shadow-lg"
              onClick={() => window.open('https://bazari.libervia.xyz/', '_blank')}
            >
              <Globe className="mr-2 h-5 w-5" />
              {t('testnet.cta.accessTestnet')}
              <ExternalLink className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2"
              onClick={() => window.open('https://bazari.libervia.xyz/doc/pt/index.html', '_blank')}
            >
              <BookOpen className="mr-2 h-5 w-5" />
              {t('testnet.cta.readDocs')}
            </Button>
          </div>

          {/* Additional Links */}
          <div className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              {t('testnet.cta.explore')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => navigate('/vesting')}
              >
                {t('testnet.cta.links.vesting')}
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => navigate('/marketplace')}
              >
                {t('testnet.cta.links.marketplace')}
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => navigate('/')}
              >
                {t('testnet.cta.links.home')}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen">
      {renderHero()}
      {renderWarning()}
      {renderPurpose()}
      {renderLegalDisclaimer()}
      {renderStrategicMessage()}
      {renderFinalCTA()}
    </div>
  );
}
