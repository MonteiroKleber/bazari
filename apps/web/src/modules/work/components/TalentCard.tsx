// path: apps/web/src/modules/work/components/TalentCard.tsx
// Card de talento na listagem

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { ProfessionalStatusBadge } from './ProfessionalStatusBadge';
import type { ProfessionalStatus, WorkPreference } from '../api';

const workPreferenceLabels: Record<WorkPreference, string> = {
  REMOTE: 'Remoto',
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
};

export interface TalentCardProps {
  talent: {
    id: string;
    user: {
      id?: string;
      handle?: string;
      displayName?: string;
      avatarUrl?: string | null;
    };
    professionalArea: string | null;
    skills: string[];
    workPreference: WorkPreference;
    status: ProfessionalStatus;
    hourlyRate?: string | null;
    hourlyRateCurrency?: string | null;
    matchScore?: number;
  };
  onClick?: () => void;
}

export function TalentCard({ talent, onClick }: TalentCardProps) {
  const initials = talent.user.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shrink-0">
            <AvatarImage src={talent.user.avatarUrl || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Name & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">
                  {talent.user.displayName || `@${talent.user.handle}`}
                </h3>
                {talent.professionalArea && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {talent.professionalArea}
                  </p>
                )}
              </div>
              <ProfessionalStatusBadge status={talent.status} size="sm" />
            </div>

            {/* Skills */}
            {talent.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {talent.skills.slice(0, 4).map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="text-xs px-2 py-0"
                  >
                    {skill}
                  </Badge>
                ))}
                {talent.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    +{talent.skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Footer: Rate & Preference */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                {talent.hourlyRate && talent.hourlyRateCurrency && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {talent.hourlyRateCurrency} {parseFloat(talent.hourlyRate).toFixed(0)}/h
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {workPreferenceLabels[talent.workPreference]}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                asChild
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto"
              >
                <Link to={`/app/work/talents/${talent.user.handle}`}>
                  Ver Perfil
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TalentCard;
