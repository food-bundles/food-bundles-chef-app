/**
 * Translation files are split by app area (locales/<lang>/<namespace>.json) so each
 * area can be reviewed on its own. Every file holds whole top-level groups
 * ("menu", "menuItem", …) and no group appears in two files, so they are merged
 * into one resource per language and existing `t('menu.title')` keys keep working.
 *
 * Kinyarwanda strings are drafts until reviewed — see docs/i18n-rw-review.md.
 */
import enAgent from './locales/en/agent.json';
import enAi from './locales/en/ai.json';
import enAuth from './locales/en/auth.json';
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enDelivery from './locales/en/delivery.json';
import enErrors from './locales/en/errors.json';
import enKitchens from './locales/en/kitchens.json';
import enMenu from './locales/en/menu.json';
import enOnboarding from './locales/en/onboarding.json';
import enOrders from './locales/en/orders.json';
import enProfile from './locales/en/profile.json';
import enSales from './locales/en/sales.json';
import enSettings from './locales/en/settings.json';
import enStock from './locales/en/stock.json';
import frAgent from './locales/fr/agent.json';
import frAi from './locales/fr/ai.json';
import frAuth from './locales/fr/auth.json';
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frDelivery from './locales/fr/delivery.json';
import frErrors from './locales/fr/errors.json';
import frKitchens from './locales/fr/kitchens.json';
import frMenu from './locales/fr/menu.json';
import frOnboarding from './locales/fr/onboarding.json';
import frOrders from './locales/fr/orders.json';
import frProfile from './locales/fr/profile.json';
import frSales from './locales/fr/sales.json';
import frSettings from './locales/fr/settings.json';
import frStock from './locales/fr/stock.json';
import rwAgent from './locales/rw/agent.json';
import rwAi from './locales/rw/ai.json';
import rwAuth from './locales/rw/auth.json';
import rwCommon from './locales/rw/common.json';
import rwDashboard from './locales/rw/dashboard.json';
import rwDelivery from './locales/rw/delivery.json';
import rwErrors from './locales/rw/errors.json';
import rwKitchens from './locales/rw/kitchens.json';
import rwMenu from './locales/rw/menu.json';
import rwOnboarding from './locales/rw/onboarding.json';
import rwOrders from './locales/rw/orders.json';
import rwProfile from './locales/rw/profile.json';
import rwSales from './locales/rw/sales.json';
import rwSettings from './locales/rw/settings.json';
import rwStock from './locales/rw/stock.json';

/** Namespace files per language, in a stable order. */
export const NAMESPACES = [
  'common',
  'ai',
  'errors',
  'auth',
  'onboarding',
  'dashboard',
  'kitchens',
  'menu',
  'stock',
  'orders',
  'delivery',
  'sales',
  'agent',
  'profile',
  'settings',
] as const;

const en = {
  ...enCommon,
  ...enAi,
  ...enErrors,
  ...enAuth,
  ...enOnboarding,
  ...enDashboard,
  ...enKitchens,
  ...enMenu,
  ...enStock,
  ...enOrders,
  ...enDelivery,
  ...enSales,
  ...enAgent,
  ...enProfile,
  ...enSettings,
};

const fr = {
  ...frCommon,
  ...frAi,
  ...frErrors,
  ...frAuth,
  ...frOnboarding,
  ...frDashboard,
  ...frKitchens,
  ...frMenu,
  ...frStock,
  ...frOrders,
  ...frDelivery,
  ...frSales,
  ...frAgent,
  ...frProfile,
  ...frSettings,
};

const rw = {
  ...rwCommon,
  ...rwAi,
  ...rwErrors,
  ...rwAuth,
  ...rwOnboarding,
  ...rwDashboard,
  ...rwKitchens,
  ...rwMenu,
  ...rwStock,
  ...rwOrders,
  ...rwDelivery,
  ...rwSales,
  ...rwAgent,
  ...rwProfile,
  ...rwSettings,
};

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
  rw: { translation: rw },
} as const;
