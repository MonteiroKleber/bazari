import { useTranslation } from 'react-i18next';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

export function Roadmap() {
  const { t } = useTranslation();

  const phases = [
    {
      title: t('roadmap.now'),
      icon: CheckCircle2,
      items: t('roadmap.now_list', { returnObjects: true }) as string[],
      status: 'active',
      color: 'text-secondary border-secondary',
    },
    {
      title: t('roadmap.next'),
      icon: Clock,
      items: t('roadmap.next_list', { returnObjects: true }) as string[],
      status: 'upcoming',
      color: 'text-primary border-primary',
    },
    {
      title: t('roadmap.future'),
      icon: Circle,
      items: t('roadmap.future_list', { returnObjects: true }) as string[],
      status: 'future',
      color: 'text-accent border-accent',
    },
  ];

  return (
    <section id="roadmap" className="py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            {t('roadmap.title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <div key={index} className="relative">
                  {/* Connector line (hidden on mobile) */}
                  {index < phases.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-border -z-10" />
                  )}

                  <div className={`border-2 rounded-xl p-6 bg-card ${phase.color}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className={`h-8 w-8 ${phase.color}`} />
                      <h3 className="text-xl font-semibold">{phase.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {phase.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2">
                          <CheckCircle2 
                            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                              phase.status === 'active' 
                                ? 'text-secondary' 
                                : 'text-muted-foreground'
                            }`} 
                          />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}