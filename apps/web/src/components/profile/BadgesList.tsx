import { Badge } from '../ui/badge';

interface BadgeItem {
  code: string;
  label: {
    pt: string;
    en: string;
    es: string;
  };
  issuedBy: string;
  issuedAt: string;
}

interface BadgesListProps {
  badges: BadgeItem[];
  limit?: number;
  lang?: 'pt' | 'en' | 'es';
}

export function BadgesList({
  badges,
  limit,
  lang = 'pt'
}: BadgesListProps) {
  const displayed = limit ? badges.slice(0, limit) : badges;
  const remaining = limit && badges.length > limit ? badges.length - limit : 0;

  if (badges.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum badge conquistado ainda
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {displayed.map((badge) => (
        <Badge
          key={badge.code}
          variant="outline"
          title={`${badge.label[lang]} - Emitido por: ${badge.issuedBy}`}
          className="cursor-help"
        >
          {badge.label[lang]}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="ghost">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
