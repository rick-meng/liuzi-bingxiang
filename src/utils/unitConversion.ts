import type { Unit } from "../types/domain.js";

const MASS_IN_G: Record<string, number> = {
  g: 1,
  kg: 1000
};

const VOLUME_IN_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tbsp: 15,
  tsp: 5
};

export function convertUnit(
  quantity: number,
  fromUnit: Unit,
  toUnit: Unit
): number | null {
  if (fromUnit === toUnit) {
    return quantity;
  }

  if (fromUnit in MASS_IN_G && toUnit in MASS_IN_G) {
    const inGram = quantity * MASS_IN_G[fromUnit];
    return inGram / MASS_IN_G[toUnit];
  }

  if (fromUnit in VOLUME_IN_ML && toUnit in VOLUME_IN_ML) {
    const inMl = quantity * VOLUME_IN_ML[fromUnit];
    return inMl / VOLUME_IN_ML[toUnit];
  }

  return null;
}

export function safeRound(quantity: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(quantity * factor) / factor;
}
