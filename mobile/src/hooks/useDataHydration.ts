/**
 * Legacy hook kept for root layout compatibility.
 * All data now hydrates through TanStack Query feature hooks:
 *   - kitchens: useKitchens() in dashboard
 *   - stock: useStockLevels()
 *   - orders: useOrders()
 *   - deliveries: useDeliveries()
 *   - menu items: useMenuItems()
 *   - sales: useSales()
 */
export function useDataHydration(): void {
  // no-op — SQLite-based hydration replaced by REST API feature hooks
}
