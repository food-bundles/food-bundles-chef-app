export { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
export { ApiError, responseToApiError, throwToApiError } from './errors';
export type { ApiErrorKind } from './errors';
export { request, setTokenProvider, getAccessToken } from './http-client';
export type { RequestOptions, TokenProvider } from './http-client';

// Auth
export {
  requestOtp,
  verifyOtp,
  refreshToken,
  logout,
  getMe,
  registerPushToken,
} from './auth-api';
export type {
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
  TokenResponse,
  RefreshBody,
  ChefProfile,
  PushTokenBody,
} from './auth-api';

// Kitchens
export {
  listKitchens,
  getKitchen,
  createKitchen,
  updateKitchen,
  archiveKitchen,
} from './kitchens-api';
export type { KitchenCreateBody, KitchenUpdateBody, KitchenDto } from './kitchens-api';

// Ingredients
export {
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from './ingredients-api';
export type { IngredientCreateBody, IngredientUpdateBody, IngredientDto } from './ingredients-api';

// Menus & recipes
export {
  listMenus,
  createMenu,
  updateMenu,
  listMenuItems,
  createMenuItem,
  updateMenuItem,
  listRecipeLines,
  addRecipeLine,
  updateRecipeLine,
  deleteRecipeLine,
  getRecipeCost,
} from './menus-api';
export type {
  MenuCreateBody,
  MenuUpdateBody,
  MenuDto,
  MenuItemCreateBody,
  MenuItemUpdateBody,
  MenuItemDto,
  RecipeLineCreateBody,
  RecipeLineUpdateBody,
  RecipeLineDto,
  RecipeCostLine,
  RecipeCostDto,
} from './menus-api';

// Sales
export { recordSale, getWeeklySalesSummary } from './sales-api';
export type {
  SaleRecordCreateBody,
  SaleRecordDto,
  WeeklyTotalDto,
  WeeklySalesSummaryDto,
} from './sales-api';

// Purchasing
export { getPurchaseSuggestions } from './purchasing-api';
export type { PurchaseSuggestionDto, PurchaseSuggestionsResponseDto } from './purchasing-api';

// Orders
export {
  listOrders,
  getOrder,
  createOrder,
  submitOrder,
  confirmOrder,
  cancelOrder,
} from './orders-api';
export type {
  OrderStatus,
  OrderLineCreateBody,
  OrderCreateBody,
  OrderLineDto,
  OrderDto,
  OrderWithLinesDto,
  OrderSubmitDto,
} from './orders-api';

// Inventory
export {
  getStockLevels,
  recordInventoryEntry,
  getInventoryHistory,
} from './inventory-api';
export type {
  InventoryEntryType,
  InventoryEntryCreateBody,
  InventoryEntryDto,
  StockLevelDto,
} from './inventory-api';

// Receiving
export { startDelivery, receiveDelivery } from './receiving-api';
export type {
  ReceivingDecision,
  ReceivingLineBody,
  BulkReceivingBody,
  ReceivingLineDto,
} from './receiving-api';

// AI (advisory only — 503 when disabled, mobile falls back to manual entry)
export { assessQuality, transcribeAudio } from './ai-api';

// AI Agent
export { agentTurn } from './agent-api';
export type {
  AgentMessage,
  AgentRequest,
  AgentResponse,
  AgentRole,
  ActionProposal,
  ActionType,
  ClarifyingQuestion,
  RecordSaleParams,
  RecordInventoryParams,
  CreateOrderParams,
  OrderLineParams,
  OrderIdParams,
  ReceiveDeliveryParams,
  ReceivingLineParams,
} from './agent-api';
export type {
  QualityResult,
  QualityDimensionResult,
  QuantityEstimate,
  QualityAssessmentResponseDto,
  TranscriptionResponseDto,
} from './ai-api';

// Offline sync
export { translateMutations, flushMutations } from './sync-api';
export type {
  SyncMutationPayload,
  SyncRequestBody,
  MutationResultDto,
  SyncResponseDto,
  UnsupportedMutation,
  TranslationResult,
} from './sync-api';

// Query keys
export { queryKeys } from './query-keys';
