export type Telecom = 'MTN' | 'AIRTEL';

export const detectTelecom = (phone: string): Telecom => {
  const prefix = phone.replace(/\D/g, '').slice(3, 5);
  return prefix === '72' || prefix === '73' ? 'AIRTEL' : 'MTN';
};
