import type { Kitchen } from '@/domain/models/kitchen';

export const MOCK_KITCHENS: Kitchen[] = [
  {
    id: 'kitchen-001',
    chefId: 'chef-0788000001',
    name: 'Kigali Bistro Kitchen',
    address: 'KG 9 Ave, Kigali, Rwanda',
    cuisineType: 'Contemporary African',
    seatingCapacity: 60,
    isArchived: false,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'kitchen-002',
    chefId: 'chef-0788000001',
    name: 'Nyamirambo Canteen',
    address: 'Nyamirambo, Kigali, Rwanda',
    cuisineType: 'Traditional Rwandan',
    seatingCapacity: 120,
    isArchived: false,
    createdAt: '2026-03-10T08:00:00Z',
  },
];
