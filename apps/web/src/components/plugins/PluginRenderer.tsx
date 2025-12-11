/**
 * Plugin Renderer Component
 *
 * Renderiza plugins dinamicamente baseado na configuração da loja
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LoyaltyWidget } from './widgets/LoyaltyWidget';
import { CashbackBadge } from './widgets/CashbackBadge';
import { CouponBanner } from './widgets/CouponBanner';
import { LoyaltyRedeemBox } from './widgets/LoyaltyRedeemBox';
import { CashbackPreview } from './widgets/CashbackPreview';
import { CouponInput } from './widgets/CouponInput';
import { DeliveryTracker } from './widgets/DeliveryTracker';

// Tipos
interface PluginConfig {
  [key: string]: unknown;
}

interface PluginBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

interface PluginComponents {
  storePage?: string;
  productCard?: string;
  checkout?: string;
  orderConfirmation?: string;
}

interface StorePlugin {
  id: string;
  pluginSlug: string;
  pluginName: string;
  category: string;
  components: PluginComponents;
  config: PluginConfig;
  branding?: PluginBranding;
}

// Mapeamento de componentes disponíveis
const PLUGIN_COMPONENTS: Record<string, React.ComponentType<PluginWidgetProps>> = {
  // Store page widgets
  LoyaltyWidget,
  CashbackBadge,
  CouponBanner,
  // Checkout widgets
  LoyaltyRedeemBox,
  CashbackPreview,
  CouponInput,
  // Order tracking widgets
  DeliveryTracker,
};

// Props padrão para widgets
export interface PluginWidgetProps {
  instanceId: string;
  config: PluginConfig;
  branding?: PluginBranding;
  storeId: string;
  position?: string;
}

interface PluginRendererProps {
  storeId: string;
  position: 'storePage' | 'productCard' | 'checkout' | 'orderConfirmation';
  className?: string;
}

export function PluginRenderer({
  storeId,
  position,
  className = '',
}: PluginRendererProps) {
  // Buscar plugins ativos da loja
  const { data: plugins, isLoading } = useQuery({
    queryKey: ['store-plugins', storeId],
    queryFn: async () => {
      return api.get<StorePlugin[]>(`/stores/${storeId}/plugins`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  if (isLoading || !plugins || plugins.length === 0) {
    return null;
  }

  // Filtrar plugins que têm componente para esta posição
  const pluginsForPosition = plugins.filter(
    (plugin: StorePlugin) => plugin.components[position]
  );

  if (pluginsForPosition.length === 0) {
    return null;
  }

  return (
    <div className={`plugin-renderer ${className}`}>
      {pluginsForPosition.map((plugin: StorePlugin) => {
        const componentName = plugin.components[position];
        if (!componentName) return null;

        const Component = PLUGIN_COMPONENTS[componentName];
        if (!Component) {
          console.warn(`Plugin component not found: ${componentName}`);
          return null;
        }

        return (
          <Component
            key={plugin.id}
            instanceId={plugin.id}
            config={plugin.config}
            branding={plugin.branding}
            storeId={storeId}
            position={position}
          />
        );
      })}
    </div>
  );
}

// Hook para buscar plugins de uma loja
export function useStorePlugins(storeId: string) {
  return useQuery({
    queryKey: ['store-plugins', storeId],
    queryFn: async () => {
      return api.get<StorePlugin[]>(`/stores/${storeId}/plugins`);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!storeId,
  });
}

// Tipo para dados de fidelidade
interface LoyaltyData {
  enabled: boolean;
  pluginName?: string;
  points?: number;
  totalEarned?: number;
  tier?: string;
  config?: {
    pointsPerBzr: number;
    redemptionRules: Array<{
      points: number;
      reward: string;
    }>;
  };
}

// Hook para buscar meus pontos de fidelidade em uma loja
export function useMyLoyaltyPoints(storeId: string) {
  return useQuery({
    queryKey: ['my-loyalty', storeId],
    queryFn: async () => {
      return api.get<LoyaltyData>(`/me/loyalty/${storeId}`);
    },
    staleTime: 60 * 1000, // 1 minuto
    enabled: !!storeId,
  });
}

export type { StorePlugin, PluginConfig, PluginBranding, PluginComponents };
