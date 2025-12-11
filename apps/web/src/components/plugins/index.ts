/**
 * Plugin System Components
 *
 * Exporta todos os componentes do sistema de plugins
 */

// Main renderer
export { PluginRenderer, useStorePlugins, useMyLoyaltyPoints } from './PluginRenderer';
export type {
  StorePlugin,
  PluginConfig,
  PluginBranding,
  PluginComponents,
  PluginWidgetProps,
} from './PluginRenderer';

// Widgets - Store Page
export { LoyaltyWidget } from './widgets/LoyaltyWidget';
export { CashbackBadge } from './widgets/CashbackBadge';
export { CouponBanner } from './widgets/CouponBanner';

// Widgets - Checkout
export { LoyaltyRedeemBox } from './widgets/LoyaltyRedeemBox';
export { CashbackPreview } from './widgets/CashbackPreview';
export { CouponInput } from './widgets/CouponInput';

// Widgets - Order Tracking
export { DeliveryTracker } from './widgets/DeliveryTracker';

// Seller Components
export { PluginConfigModal } from './seller/PluginConfigModal';
export { JsonSchemaForm, BrandingForm } from './seller/forms';
