// path: apps/web/src/modules/work/components/JobCard.tsx
// Card de vaga na listagem

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, DollarSign, Users, Clock, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { JobSearchItem, WorkPreference, PaymentPeriod } from '../api';

const workPreferenceLabels: Record<WorkPreference, string> = {
  REMOTE: 'Remoto',
  ON_SITE: 'Presencial',
  HYBRID: 'Híbrido',
};

const paymentPeriodLabels: Record<PaymentPeriod, string> = {
  HOURLY: '/hora',
  DAILY: '/dia',
  WEEKLY: '/semana',
  MONTHLY: '/mês',
  PROJECT: '/projeto',
};

export interface JobCardProps {
  job: JobSearchItem;
  onClick?: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const companyInitials = job.company.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleClick = () => {
    if (onClick) onClick();
  };

  const publishedAgo = job.publishedAt
    ? formatDistanceToNow(new Date(job.publishedAt), { addSuffix: true, locale: ptBR })
    : null;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header: Title + Company */}
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
              <AvatarImage src={job.company.logoUrl || undefined} />
              <AvatarFallback>{companyInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                {job.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {job.company.name} • {workPreferenceLabels[job.workType]}
              </p>
            </div>
          </div>

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs px-2 py-0"
                >
                  {skill}
                </Badge>
              ))}
              {job.skills.length > 4 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{job.skills.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Footer: Payment + Applicants + Date */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground flex-wrap">
              {job.paymentValue && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {job.paymentCurrency} {parseFloat(job.paymentValue).toLocaleString('pt-BR')}
                  {job.paymentPeriod && paymentPeriodLabels[job.paymentPeriod]}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {job.applicationsCount} {job.applicationsCount === 1 ? 'candidato' : 'candidatos'}
              </span>
              {publishedAgo && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {publishedAgo}
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-auto"
            >
              <Link to={`/app/work/jobs/${job.id}`}>
                Ver Vaga
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default JobCard;
