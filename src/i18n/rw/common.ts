import type { common as commonEn } from '../en/common';

export const common: Record<keyof typeof commonEn, string> = {
  tab_shop: 'Kugura',
  tab_orders: 'Ibyatumijwe',
  tab_wallet: 'Ikofi',
  tab_more: 'Ibindi',
  nav_aiSupport: 'Ubufasha bwa AI',

  st_pending: 'Bitegereje',
  st_confirmed: 'Byemejwe',
  st_preparing: 'Birategurwa',
  st_ready: 'Biriteguye',
  st_intransit: 'Biri mu nzira',
  st_delivered: 'Byatanzwe',
  st_cancelled: 'Byahagaritswe',
  st_refunded: 'Byasubijwe',

  action_back: 'Subira inyuma',
  action_retry: 'Ongera ugerageze',
  action_continue: 'Komeza',
  action_cancel: 'Hagarika',
  action_save: 'Bika',
  action_close: 'Funga',
  action_remove: 'Kuraho',

  common_loading: 'Birimo gutegurwa…',
  common_pressBackToExit: 'Ongera ukande inyuma kugira ngo usohoke',
  a11y_skipSplash: 'Simbuka ku mbonekarize y’itangira',
  a11y_decreaseQty: 'Gabanya umubare',
  a11y_increaseQty: 'Ongera umubare',
};
