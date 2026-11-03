import type { Address } from './types';

export const addresses: Address[] = [
  {
    id: 'addr-1',
    label: 'Kigali Bistro HQ',
    street: 'KG 11 Ave, Kimihurura',
    landmark: 'Near Kimihurura roundabout',
    phone: '+250 788 123 456',
    isDefault: true,
  },
  {
    id: 'addr-2',
    label: 'Remera branch',
    street: 'KG 17 Ave, Remera',
    phone: '+250 788 123 456',
    isDefault: false,
  },
];
