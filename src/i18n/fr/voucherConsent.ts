import type { voucherConsent as voucherConsentEn } from '../en/voucherConsent';

export const voucherConsent: Record<keyof typeof voucherConsentEn, string> = {
  consent_title: "Autoriser l'accès aux données",
  consent_subtitle:
    "FoodBundles utilise des données vérifiées de partenaires de confiance pour calculer votre limite de crédit. Chaque source que vous autorisez améliore votre limite.",
  consent_whatWeCollect: 'Ce que nous collectons',
  consent_alwaysIncluded: 'Toujours inclus',
  consent_acknowledgement:
    "Je confirme que chaque source sélectionnée peut accéder à mes données commerciales pendant 30 jours, conformément à la politique de données de FoodBundles.",
  consent_continue: 'Continuer avec les sources sélectionnées',
  consent_moreSourcesHint: 'Plus vous autorisez de sources, plus votre limite de crédit potentielle est élevée.',
  consent_estimatedLimit: 'Limite estimée : {{amount}}',
  consent_otherSources: 'Autres sources',
  consent_selectAll: 'Tout sélectionner',
  consent_included: 'Inclus',

  consent_otpTitle: "Confirmer l'accès aux données",
  consent_otpSubtitleAll:
    'Entrez le code à 6 chiffres envoyé au {{phone}} pour autoriser l’accès pour toutes les sources sélectionnées pendant 30 jours.',
  consent_rememberChoice: 'Se souvenir de mon choix pour ces sources — ne plus demander',
  consent_otpConfirm: "Confirmer l'accès",

  consent_euclName: 'EUCL Cash Power',
  consent_euclDescription: "Historique d'achat d'électricité de votre compteur enregistré.",
  consent_euclBullet1: "Montants et dates d'achat d'électricité",
  consent_euclBullet2: 'ID et emplacement du compteur',
  consent_euclHelps: 'Montre la régularité financière et si vos locaux sont possédés ou loués.',

  consent_rraName: 'Reçus EBM de la RRA',
  consent_rraDescription: 'Ventes vérifiées fiscalement par votre machine de facturation électronique.',
  consent_rraBullet1: 'Registres de ventes vérifiés fiscalement',
  consent_rraBullet2: 'Historique de conformité TVA',
  consent_rraBullet3: 'Tendance des revenus déclarés',
  consent_rraHelps: 'Notre signal le plus important — les revenus vérifiés augmentent le plus votre limite.',

  consent_vubaName: 'Vuba Vuba',
  consent_vubaDescription: 'Historique de commandes de livraison sur la plateforme Vuba Vuba.',
  consent_vubaBullet1: 'Volume et fréquence des commandes',
  consent_vubaBullet2: 'Emplacement de retrait de livraison',
  consent_vubaBullet3: 'Rythme de trésorerie',
  consent_vubaHelps: 'Recoupé avec les reçus EBM pour vérifier votre volume de ventes réel.',

  consent_kaykoName: 'Kayko POS',
  consent_kaykoDescription: 'Ventes au comptoir et sur place depuis votre caisse Kayko.',
  consent_kaykoBullet1: 'Ventes au comptoir et sur place',
  consent_kaykoBullet2: 'Horodatage des transactions',
  consent_kaykoHelps: 'Capture les ventes en magasin que les plateformes de livraison ne voient jamais.',

  consent_foodbundlesName: 'Transactions FoodBundles',
  consent_foodbundlesDescription: 'Votre propre historique de commandes et de remboursement avec FoodBundles.',
  consent_foodbundlesBullet1: 'Historique de remboursement',
  consent_foodbundlesBullet2: 'Habitudes de solde prépayé',
  consent_foodbundlesHelps: 'Vos propres données — toujours incluses, sans autorisation supplémentaire.',

  consent_bureauName: 'Bureau de crédit',
  consent_bureauDescription: 'Une vérification standard de votre exposition à la dette existante.',
  consent_bureauBullet1: 'Prêts et lignes de crédit en cours',
  consent_bureauBullet2: 'Statut de remboursement auprès d’autres prêteurs',
  consent_bureauHelps: 'Confirme que vous pouvez assumer un crédit supplémentaire de manière responsable.',

  consent_expiredSingle: 'Votre accès aux données {{source}} a expiré — renouvelez pour conserver votre limite',
  consent_expiredMultiple: '{{count}} sources de données ont expiré — renouvelez pour conserver votre limite',
  consent_renew: 'Renouveler',

  score_title: 'Vous êtes approuvé pour',
  score_approvedLimit: '{{amount}}',
  score_creditLineTitle: 'Votre ligne de crédit',
  score_availableToUse: 'Disponible : {{amount}}',
  score_validFor: 'Valable 30 jours · Se renouvelle le {{date}}',
  score_supplier: 'Fournisseur : {{name}}',
  score_authorizeMoreSources: 'Autorisez plus de sources de données pour augmenter votre limite →',
  score_claimCta: 'Réclamer votre ligne de crédit',
};
