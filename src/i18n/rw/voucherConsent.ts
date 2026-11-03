import type { voucherConsent as voucherConsentEn } from '../en/voucherConsent';

export const voucherConsent: Record<keyof typeof voucherConsentEn, string> = {
  consent_title: 'Emeza ko amakuru yawe akoreshwa',
  consent_subtitle:
    'FoodBundles ikoresha amakuru yemejwe n’abafatanyabikorwa bizewe kugira ngo igene urwego rwawe rw’inguzanyo. Buri soko wemereye ryongera urwego rwawe.',
  consent_whatWeCollect: 'Ibyo dukusanya',
  consent_alwaysIncluded: 'Birimo buri gihe',
  consent_acknowledgement:
    'Nemeje ko buri soko nahisemo rishobora kubona amakuru y’ubucuruzi bwanjye mu minsi 30, hakurikijwe politiki y’amakuru ya FoodBundles.',
  consent_continue: 'Komeza n’amasoko wahisemo',
  consent_moreSourcesHint: 'Uko wemera amasoko menshi ni ko urwego rwawe rw’inguzanyo rushobora kwiyongera.',
  consent_estimatedLimit: 'Urwego rwagenwe: {{amount}}',
  consent_otherSources: 'Andi masoko',
  consent_selectAll: 'Hitamo byose',
  consent_included: 'Birimo',

  consent_otpTitle: 'Emeza ko amakuru abonwa',
  consent_otpSubtitleAll: 'Andika kode y’imibare 6 yoherejwe kuri {{phone}} kugira ngo wemeze ko amasoko wahisemo yose abona amakuru mu minsi 30.',
  consent_rememberChoice: 'Bika icyo nahisemo kuri aya masoko — ntumbaze nanone',
  consent_otpConfirm: 'Emeza uburenganzira',

  consent_euclName: 'EUCL Cash Power',
  consent_euclDescription: 'Amateka yo kugura amashanyarazi kuri konte yawe yanditswe.',
  consent_euclBullet1: 'Amafaranga n’amatariki yo kugura amashanyarazi',
  consent_euclBullet2: 'Nomero ya konte n’aho iherereye',
  consent_euclHelps: 'Yerekana uko ubucuruzi bwawe buhagaze n’aho ari ah’ubwawe cyangwa ah’ukodesha.',

  consent_rraName: 'Inyemezabuguzi za RRA (EBM)',
  consent_rraDescription: 'Ibyacurujwe byemejwe n’umusoro biva kuri mudasobwa yawe ya EBM.',
  consent_rraBullet1: 'Amateka y’ibyacurujwe byemejwe n’umusoro',
  consent_rraBullet2: 'Amateka yo kwishyura TVA',
  consent_rraBullet3: 'Uko amafaranga yinjira agenda ahinduka',
  consent_rraHelps: 'Ni cyo gice cy’ingenzi kurusha ibindi — amafaranga yemejwe yongera cyane urwego rwawe.',

  consent_vubaName: 'Vuba Vuba',
  consent_vubaDescription: 'Amateka y’ibyatumijwe biciye kuri Vuba Vuba.',
  consent_vubaBullet1: 'Umubare n’inshuro z’ibyatumijwe',
  consent_vubaBullet2: 'Aho ibicuruzwa bikuwe',
  consent_vubaBullet3: 'Igihe amafaranga yinjira',
  consent_vubaHelps: 'Bigereranywa n’inyemezabuguzi za EBM kugira ngo hamenyekane ukuri ku byacurujwe byawe.',

  consent_kaykoName: 'Kayko POS',
  consent_kaykoDescription: 'Ibyacurujwe ku ivuriro ryawe biva kuri Kayko.',
  consent_kaykoBullet1: 'Ibyacurujwe ku ivuriro',
  consent_kaykoBullet2: 'Igihe ibyacurujwe byabaye',
  consent_kaykoHelps: 'Yerekana ibyacurujwe ku ivuriro ibindi bikoresho bidashobora kubona.',

  consent_foodbundlesName: 'Ibikorwa bya FoodBundles',
  consent_foodbundlesDescription: 'Amateka yawe yo gutumiza no kwishyura kuri FoodBundles.',
  consent_foodbundlesBullet1: 'Amateka yo kwishyura',
  consent_foodbundlesBullet2: 'Uko ukoresha ikofi yawe',
  consent_foodbundlesHelps: 'Ni amakuru yawe bwite — arimo buri gihe, nta bwemezi bwongeye bukenewe.',

  consent_bureauName: 'Ikigo cy’inguzanyo',
  consent_bureauDescription: 'Igenzura risanzwe ry’inguzanyo ufite ahandi.',
  consent_bureauBullet1: 'Inguzanyo n’imyenda ufite ahandi',
  consent_bureauBullet2: 'Uko wishyura izindi nguzanyo',
  consent_bureauHelps: 'Yemeza ko ushobora kwakira indi nguzanyo mu buryo bushyize mu gaciro.',

  consent_expiredSingle: 'Uburenganzira bwo kubona amakuru ya {{source}} bwarangiye — bwongere kugira ngo ukomeze kugira urwego rwawe',
  consent_expiredMultiple: 'Amasoko {{count}} yarangije igihe — yongere kugira ngo ukomeze kugira urwego rwawe',
  consent_renew: 'Ongera',

  score_title: 'Wemerewe',
  score_approvedLimit: '{{amount}}',
  score_creditLineTitle: 'Urwego rwawe rw’inguzanyo',
  score_availableToUse: 'Ufite ushobora gukoresha: {{amount}}',
  score_validFor: 'Bimara iminsi 30 · Bizongera ku {{date}}',
  score_supplier: 'Uwaguriza: {{name}}',
  score_authorizeMoreSources: 'Emeza andi masoko kugira ngo wongere urwego rwawe →',
  score_claimCta: 'Fata inguzanyo yawe',
};
