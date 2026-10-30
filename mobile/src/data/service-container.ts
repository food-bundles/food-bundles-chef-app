import type { KitchenRepository } from './repositories/kitchen-repository';
import type { StockRepository } from './repositories/stock-repository';
import type { DeliveryRepository } from './repositories/delivery-repository';
import type { SalesRepository } from './repositories/sales-repository';
import type { MutationQueueRepository } from './repositories/mutation-queue-repository';
import {
  KitchenSQLiteRepository,
  StockSQLiteRepository,
  DeliverySQLiteRepository,
  SalesSQLiteRepository,
  MutationQueueSQLiteRepository,
} from './sqlite';

/**
 * Singleton repository instances for the app's lifetime.
 * Swap implementations here for tests or future backends.
 */
export const kitchenRepo: KitchenRepository = new KitchenSQLiteRepository();
export const stockRepo: StockRepository = new StockSQLiteRepository();
export const deliveryRepo: DeliveryRepository = new DeliverySQLiteRepository();
export const salesRepo: SalesRepository = new SalesSQLiteRepository();
export const mutationQueueRepo: MutationQueueRepository = new MutationQueueSQLiteRepository();
