import type { landing as landingEn } from '../en/landing';

export const landing: Record<keyof typeof landingEn, string> = {
  landing_login: 'Se connecter ou créer un compte',
  landing_shopNow: 'Acheter maintenant',
  landing_mostPopular: 'Le plus populaire',

  onboarding_skip: 'Passer',
  onboarding_next: 'Suivant',
  onboarding_getStarted: 'Commencer',
  onboarding_alreadyHaveAccount: 'Vous avez déjà un compte ? Connectez-vous',
  onboarding_shopAsGuest: 'Acheter en tant qu’invité',
  onboarding_slide1Title: 'Commandez des produits frais pour votre cuisine',
  onboarding_slide1Subtitle:
    'Approvisionnez-vous en ingrédients de qualité directement auprès des coopératives rwandaises, livrés le jour même à votre restaurant ou hôtel.',
  onboarding_slide2Title: 'Suivez chaque commande en temps réel',
  onboarding_slide2Subtitle:
    'Suivez votre livraison de la confirmation jusqu’à la porte de votre cuisine, à chaque étape.',
  onboarding_slide3Title: 'Gérez tout l’approvisionnement de votre restaurant au même endroit',
  onboarding_slide3Subtitle:
    'Portefeuille, bons et recommandes — tout ce dont votre cuisine a besoin pour bien fonctionner.',

  a11y_chefImage: 'Un chef préparant des produits frais',
};
