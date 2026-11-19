import { detectAnomaly } from '@/domain/anomaly';
import type { MenuItemCategory, MenuItemDto } from '@/api/menus-api';
import type { MenuExtractItem } from '@/features/ai/schemas';

/**
 * Pure logic for the Scan Menu review screen: turning AI-extracted items into
 * editable rows, flagging what the chef should double-check, and planning the
 * import. Nothing here talks to the network.
 */

/** Fields read with less confidence than this are labelled "check". */
export const LOW_CONFIDENCE = 0.6;

export interface ReviewRow {
  /** Stable per row; also the idempotency key for its create request. */
  key: string;
  name: string;
  /** Whole RWF as digits; '' when the menu showed no readable price. */
  price: string;
  category: MenuItemCategory | null;
  description: string | null;
  selected: boolean;
  nameConfidence: number;
  priceConfidence: number;
  /** Line of menu text the item was read from (shown to help checking). */
  sourceText: string | null;
  /** Existing menu item with the same name — selecting the row updates its price. */
  duplicateOf: { id: string; menuId: string; name: string; price: string } | null;
  /** Request id of the extraction (menu page) this row came from. */
  requestId: string;
}

export type RowFlag =
  | 'check_name'
  | 'check_price'
  | 'no_price'
  | 'price_high'
  | 'price_low'
  | 'duplicate_same_price'
  | 'duplicate_new_price';

/** Comparable dish name: case, accents, punctuation and extra spaces ignored. */
export function normaliseName(name: string): string {
  const decomposed = typeof name.normalize === 'function' ? name.normalize('NFD') : name;
  return decomposed
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function wholeRwf(value: string | number | null | undefined): number | null {
  const n = typeof value === 'number' ? value : value ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Review rows for newly extracted items. Items already in `existingRows` (an earlier
 * page of the same menu) are skipped; items already on the menu are linked as
 * duplicates and start unselected, so nothing changes unless the chef opts in.
 */
export function buildReviewRows(
  items: MenuExtractItem[],
  menu: MenuItemDto[],
  existingRows: ReviewRow[],
  makeKey: () => string,
  requestId = '',
): ReviewRow[] {
  const onMenu = new Map(menu.map((m) => [normaliseName(m.name), m]));
  const seen = new Set(existingRows.map((r) => normaliseName(r.name)));
  const rows: ReviewRow[] = [];
  for (const item of items) {
    const name = item.name.trim();
    const norm = normaliseName(name);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    const match = onMenu.get(norm);
    rows.push({
      key: makeKey(),
      name,
      // v2: the settled price in the kitchen's currency; v1 servers send a whole number.
      price: item.price_money ? item.price_money.amount : item.price != null && item.price > 0 ? String(item.price) : '',
      category: item.category,
      description: item.description,
      selected: !match,
      nameConfidence: item.name_confidence,
      priceConfidence: item.price_money || item.price != null ? item.price_confidence : 0,
      sourceText: item.source_text,
      duplicateOf: match
        ? { id: match.id, menuId: match.menu_id, name: match.name, price: match.selling_price }
        : null,
      requestId,
    });
  }
  return rows;
}

/**
 * What the chef should look at on a row, in display order. Prices are compared with
 * the existing menu (or, for a new menu, with the other scanned prices).
 */
export function rowFlags(row: ReviewRow, peerPrices: number[]): RowFlag[] {
  const flags: RowFlag[] = [];
  if (row.nameConfidence < LOW_CONFIDENCE) flags.push('check_name');
  const price = wholeRwf(row.price);
  if (price === null) {
    flags.push('no_price');
  } else {
    if (row.priceConfidence < LOW_CONFIDENCE) flags.push('check_price');
    const anomaly = detectAnomaly(price, peerPrices);
    if (anomaly === 'high') flags.push('price_high');
    if (anomaly === 'low') flags.push('price_low');
  }
  if (row.duplicateOf) {
    flags.push(
      price !== null && price !== wholeRwf(row.duplicateOf.price) ? 'duplicate_new_price' : 'duplicate_same_price',
    );
  }
  return flags;
}

/**
 * Prices the anomaly check compares `row` against: the live menu when it has enough
 * priced items, otherwise the other scanned rows (never the row itself).
 */
export function peerPricesFor(row: ReviewRow, menu: MenuItemDto[], rows: ReviewRow[]): number[] {
  const live = menu.map((m) => wholeRwf(m.selling_price)).filter((p): p is number => p !== null);
  if (live.length >= 2) return live;
  return rows
    .filter((r) => r.key !== row.key)
    .map((r) => wholeRwf(r.price))
    .filter((p): p is number => p !== null);
}

/** i18n key of the blocking problem on a selected row, or null when it can be imported. */
export function rowError(row: ReviewRow): string | null {
  if (!row.selected) return null;
  if (row.name.trim().length < 2) return 'menu.scan.nameRequired';
  if (wholeRwf(row.price) === null) return 'menu.scan.priceRequired';
  return null;
}

export interface ImportPlan {
  creates: ReviewRow[];
  /** Existing items whose price changes. */
  updates: ReviewRow[];
}

/** Selected rows split into new items and price updates (unchanged duplicates are skipped). */
export function importPlan(rows: ReviewRow[]): ImportPlan {
  const creates: ReviewRow[] = [];
  const updates: ReviewRow[] = [];
  for (const row of rows) {
    if (!row.selected || rowError(row)) continue;
    if (!row.duplicateOf) creates.push(row);
    else if (wholeRwf(row.price) !== wholeRwf(row.duplicateOf.price)) updates.push(row);
  }
  return { creates, updates };
}
