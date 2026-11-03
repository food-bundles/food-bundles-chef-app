import type { wallet as walletEn } from '../en/wallet';

export const wallet: Record<keyof typeof walletEn, string> = {
  wallet_title: 'Portefeuille',
  wallet_availableBalance: 'Solde disponible',
  wallet_topUp: 'Recharger',
  wallet_history: 'Historique',
  wallet_recentActivity: 'Activité récente',
  wallet_seeAll: 'Voir tout',
  wallet_topUpWallet: 'Recharger le portefeuille',
  wallet_payFrom: 'Payer depuis',
  wallet_shareLink: 'Partager le lien',
  wallet_askAccountant: 'Demander au comptable',
  wallet_topUpAmount: 'Recharger {{amount}}',
  wallet_amountLabel: 'Montant',
  wallet_transactions: 'Transactions',
  wallet_filterAll: 'Toutes',
  wallet_filterTopUps: 'Recharges',
  wallet_filterPayments: 'Paiements',
  wallet_filterRefunds: 'Remboursements',
  wallet_emptyTitle: 'Aucune activité pour le moment',
  wallet_emptyMessage: 'Rechargez ou effectuez un paiement pour voir l’activité ici.',
  wallet_shareSheetTitle: 'Partager le lien de recharge',
  wallet_shareSheetMessage:
    'Partagez ce lien avec toute personne pouvant payer en votre nom — le montant est conservé.',
  wallet_accountantSheetTitle: 'Demander à votre comptable',
  wallet_accountantSheetMessage:
    'Envoyez cette demande de recharge à votre comptable afin qu’il puisse la compléter en votre nom.',

  a11y_shareTopUpLink: 'Partager le lien de recharge',
  a11y_askAccountantTopUp: 'Demander à votre comptable de recharger',
};
