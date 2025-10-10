import {
  MessageSquare,
  Flame,
  Heart,
  ShieldCheck,
  BadgeCheck,
  Award,
  Users,
  Zap,
  type LucideIcon
} from 'lucide-react';

export interface BadgeConfig {
  icon: LucideIcon;
  name: string;
  description: string;
}

export const BADGE_CONFIG: Record<string, BadgeConfig> = {
  FIRST_POST: {
    icon: MessageSquare,
    name: 'Primeira Publicação',
    description: 'Criou seu primeiro post na plataforma'
  },
  POST_STREAK: {
    icon: Flame,
    name: 'Sequência de Posts',
    description: 'Publicou por 7 dias consecutivos'
  },
  ENGAGEMENT_MASTER: {
    icon: Heart,
    name: 'Mestre do Engajamento',
    description: 'Recebeu 100 curtidas em posts'
  },
  TRUSTED_SELLER: {
    icon: ShieldCheck,
    name: 'Vendedor Confiável',
    description: 'Mantém alta reputação em vendas'
  },
  VERIFIED: {
    icon: BadgeCheck,
    name: 'Verificado',
    description: 'Perfil verificado pela equipe'
  },
  TOP_CONTRIBUTOR: {
    icon: Award,
    name: 'Top Contribuidor',
    description: 'Entre os usuários mais ativos'
  },
  COMMUNITY_LEADER: {
    icon: Users,
    name: 'Líder Comunitário',
    description: 'Ajudou a construir a comunidade'
  },
  EARLY_ADOPTER: {
    icon: Zap,
    name: 'Early Adopter',
    description: 'Entre os primeiros usuários'
  }
};

export const TIER_COLORS: Record<number, string> = {
  1: 'text-zinc-400',   // Bronze
  2: 'text-zinc-300',   // Prata
  3: 'text-yellow-500', // Ouro
  4: 'text-purple-500', // Platinum
  5: 'text-cyan-500'    // Diamante
};

export const TIER_NAMES: Record<number, string> = {
  1: 'Bronze',
  2: 'Prata',
  3: 'Ouro',
  4: 'Platinum',
  5: 'Diamante'
};
