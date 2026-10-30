/** Realistic mock data for the dashboard screen */
export const MOCK_DASHBOARD = {
  lowStockCount: 3,
  pendingOrderCount: 2,
  todayDeliveryCount: 1,

  alerts: [
    { id: 'a1', message: 'Tomatoes below 1 day cover — reorder today.' },
    { id: 'a2', message: 'Delivery from Food Bundles expected between 07:00–09:00.' },
  ],

  lowStockItems: [
    { id: 'i1', name: 'Tomatoes', currentStock: 4, unit: 'kg', daysOfCover: 0.5 },
    { id: 'i2', name: 'Onions', currentStock: 6, unit: 'kg', daysOfCover: 0.8 },
    { id: 'i3', name: 'Cooking Oil', currentStock: 2, unit: 'L', daysOfCover: 0.9 },
  ],

  recentDeliveries: [
    { id: 'd1', supplierName: 'Food Bundles', date: 'Today 07:45', status: 'received' },
    { id: 'd2', supplierName: 'Food Bundles', date: 'Yesterday', status: 'partial' },
    { id: 'd3', supplierName: 'Food Bundles', date: '2 days ago', status: 'received' },
  ],

  procurementReminder:
    '3 ingredients are below their reorder threshold. Your purchase list is ready to review before tomorrow\'s service.',
};
