import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Globe, Crown, Code } from 'lucide-react';

export function BlockchainSection() {
  const { t } = useTranslation();

  const pillars = [
    {
      icon: Shield,
      title: t('blockchain.unstoppable_title', { defaultValue: '🔐 Ninguém Pode Parar' }),
      description: t('blockchain.unstoppable_desc', {
        defaultValue: 'Sem servidor central. Sem empresa controlando. Sem chance de censura.'
      })
    },
    {
      icon: Globe,
      title: t('blockchain.borderless_title', { defaultValue: '🌍 Sem Fronteiras' }),
      description: t('blockchain.borderless_desc', {
        defaultValue: 'Envie BZR para qualquer lugar do mundo. Sem bancos, sem permissão, sem limites.'
      })
    },
    {
      icon: Crown,
      title: t('blockchain.sovereign_title', { defaultValue: '👑 Você é Dono' }),
      description: t('blockchain.sovereign_desc', {
        defaultValue: 'Suas chaves, seu dinheiro, sua loja. Soberania total. Ninguém pode congelar ou bloquear.'
      })
    },
    {
      icon: Code,
      title: t('blockchain.opensource_title', { defaultValue: '🔧 Código Aberto' }),
      description: t('blockchain.opensource_desc', {
        defaultValue: 'Transparente, auditável e construído pela comunidade.'
      })
    }
  ];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-muted/30 to-muted/50 relative overflow-hidden">
      {/* Animated blockchain grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern animate-grid-flow"></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-primary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-secondary rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-pulse animation-delay-2000"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t('blockchain.title', { defaultValue: '⛓️ Blockchain: Imparável e Sem Fronteiras' })}
              </span>
            </h2>
          </div>

          {/* Blockchain Animation Area */}
          <div className="mb-12 relative">
            <Card className="bg-card/50 border-border backdrop-blur">
              <CardContent className="pt-8 pb-8">
                <div className="flex items-center justify-center gap-4 overflow-hidden">
                  {/* Block animations */}
                  {[1, 2, 3, 4].map((block) => (
                    <div
                      key={block}
                      className="flex items-center gap-4 animate-slide-right"
                      style={{ animationDelay: `${block * 0.5}s` }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="h-16 w-16 md:h-20 md:w-20 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-mono text-xs md:text-sm border-2 border-primary/50 shadow-lg shadow-primary/50">
                          <div className="text-center text-primary-foreground">
                            <div className="text-[8px] md:text-[10px] opacity-80">Block</div>
                            <div className="font-bold">#{1234567 + block}</div>
                          </div>
                        </div>
                        <div className="text-[8px] md:text-[10px] text-muted-foreground mt-1">
                          {block * 3}s ago
                        </div>
                      </div>
                      {block < 4 && (
                        <div className="flex flex-col gap-1">
                          <div className="h-0.5 w-8 bg-gradient-to-r from-primary to-secondary"></div>
                          <div className="h-0.5 w-8 bg-gradient-to-r from-secondary to-accent"></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <Card
                  key={index}
                  className="bg-card/50 border-border backdrop-blur hover:bg-card/70 transition-all duration-300 group"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-secondary flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{pillar.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">{pillar.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-border hover:bg-muted min-w-[200px]"
              onClick={() => window.open('https://docs.bazari.io', '_blank')}
            >
              📚 {t('blockchain.cta_docs', { defaultValue: 'Documentação Técnica' })}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-border hover:bg-muted min-w-[200px]"
              onClick={() => window.open('https://github.com/bazari', '_blank')}
            >
              💻 {t('blockchain.cta_github', { defaultValue: 'Ver no GitHub' })}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes grid-flow {
          0% { transform: translateY(0); }
          100% { transform: translateY(20px); }
        }
        .animate-grid-flow {
          animation: grid-flow 3s linear infinite;
        }
        @keyframes slide-right {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-right {
          animation: slide-right 1s ease-out forwards;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .bg-grid-pattern {
          background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>
    </section>
  );
}
