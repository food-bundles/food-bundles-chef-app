import type { common as commonEn } from '../en/common';

export const common: Record<keyof typeof commonEn, string> = {
  tab_shop: 'Boutique',
  tab_orders: 'Commandes',
  tab_wallet: 'Portefeuille',
  tab_more: 'Plus',
  nav_aiSupport: 'Assistance IA',

  st_pending: 'En attente',
  st_confirmed: 'Confirmée',
  st_preparing: 'En préparation',
  st_ready: 'Prête',
  st_intransit: 'En transit',
  st_delivered: 'Livrée',
  st_cancelled: 'Annulée',
  st_refunded: 'Remboursée',

  action_back: 'Retour',
  action_retry: 'Réessayer',
  action_continue: 'Continuer',
  action_cancel: 'Annuler',
  action_save: 'Enregistrer',
  action_close: 'Fermer',
  action_remove: 'Retirer',

  common_loading: 'Chargement…',
  common_pressBackToExit: 'Appuyez à nouveau sur retour pour quitter',
  a11y_skipSplash: "Passer l'écran de démarrage",
  a11y_decreaseQty: 'Diminuer la quantité',
  a11y_increaseQty: 'Augmenter la quantité',
};
