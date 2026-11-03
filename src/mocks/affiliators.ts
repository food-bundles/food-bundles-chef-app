import type { Affiliator } from './types';

export const affiliators: Affiliator[] = [
  { id: 'aff-1', name: 'Jean-Paul Kagabo', role: 'Purchasing', status: 'ACTIVE' },
  { id: 'aff-2', name: 'Diane Mukamana', role: 'Kitchen lead', status: 'ACTIVE' },
  {
    id: 'aff-3',
    name: 'Eric Niyonzima',
    role: 'Purchasing',
    status: 'INVITED',
    conversationId: 'conv-peer-affiliator-eric',
  },
];
