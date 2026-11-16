/** Supported unit identifiers (lower-case canonical form). */
export type UnitId =
  | 'kg' | 'g' | 'mg'
  | 'L' | 'ml'
  | 'piece' | 'pieces'
  | 'bunch' | 'tray' | 'bag' | 'box' | 'crate' | 'portion';

/** Conversion table: how many of the base unit equals 1 of this unit. */
const TO_BASE: Partial<Record<string, number>> = {
  // mass — base: g
  kg: 1_000,
  g: 1,
  mg: 0.001,
  // volume — base: ml
  l: 1_000,
  L: 1_000,
  ml: 1,
  // discrete units — base: piece
  piece: 1,
  pieces: 1,
  bunch: 1,
  tray: 1,
  bag: 1,
  box: 1,
  crate: 1,
  portion: 1,
};

type UnitFamily = 'mass' | 'volume' | 'discrete';

const UNIT_FAMILY: Partial<Record<string, UnitFamily>> = {
  kg: 'mass', g: 'mass', mg: 'mass',
  l: 'volume', L: 'volume', ml: 'volume',
  piece: 'discrete', pieces: 'discrete',
  bunch: 'discrete', tray: 'discrete', bag: 'discrete',
  box: 'discrete', crate: 'discrete', portion: 'discrete',
};

/** Returns true if fromUnit and toUnit can be converted to each other. */
export function canConvert(fromUnit: string, toUnit: string): boolean {
  const f = UNIT_FAMILY[fromUnit];
  const t = UNIT_FAMILY[toUnit];
  return f !== undefined && t !== undefined && f === t;
}

/**
 * Converts `qty` in `fromUnit` to `toUnit`.
 * Throws if units are from different families.
 */
export function convertUnit(qty: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return qty;
  if (!canConvert(fromUnit, toUnit)) {
    throw new Error(`Cannot convert from "${fromUnit}" to "${toUnit}": incompatible unit families.`);
  }
  const fromBase = TO_BASE[fromUnit];
  const toBase = TO_BASE[toUnit];
  if (fromBase === undefined || toBase === undefined) {
    throw new Error(`Unknown unit: "${fromUnit}" or "${toUnit}"`);
  }
  return (qty * fromBase) / toBase;
}

/** Returns a human-readable hint, e.g. "1 kg = 1 000 g". Empty string if unknown. */
export function conversionHint(fromUnit: string, toUnit: string): string {
  if (!canConvert(fromUnit, toUnit) || fromUnit === toUnit) return '';
  try {
    const converted = convertUnit(1, fromUnit, toUnit);
    const formatted = converted % 1 === 0
      ? converted.toLocaleString()
      : converted.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return `1 ${fromUnit} = ${formatted} ${toUnit}`;
  } catch {
    return '';
  }
}
