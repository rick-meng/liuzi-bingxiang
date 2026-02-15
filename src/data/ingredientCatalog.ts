import { INGREDIENT_SEED } from "./ingredientSeed.js";
import type { IngredientCatalogItem, Market } from "../types/domain.js";
import { loadGeneratedData } from "../utils/generatedData.js";

function buildFallbackCatalog(): IngredientCatalogItem[] {
  return INGREDIENT_SEED.map((seed) => ({
    ingredientKey: seed.ingredientKey,
    nameZh: seed.nameZh,
    nameEn: seed.nameEn,
    aliases: seed.aliases,
    category: seed.category,
    storageType: seed.storageType,
    typicalUnits: seed.typicalUnits,
    channels: seed.defaultChannels,
    markets: seed.markets,
    supplySignals: []
  }));
}

const fallbackCatalog = buildFallbackCatalog();
const generatedCatalog = loadGeneratedData<IngredientCatalogItem[]>(
  "ingredientCatalog.generated.json",
  []
);

function mergeCatalog(
  seedCatalog: IngredientCatalogItem[],
  generated: IngredientCatalogItem[]
): IngredientCatalogItem[] {
  const merged = new Map<string, IngredientCatalogItem>();

  for (const item of seedCatalog) {
    merged.set(item.ingredientKey, item);
  }

  for (const item of generated) {
    merged.set(item.ingredientKey, item);
  }

  return [...merged.values()];
}

export const INGREDIENT_CATALOG: IngredientCatalogItem[] = mergeCatalog(
  fallbackCatalog,
  generatedCatalog
);

export function getIngredientCatalogByMarket(market: Market): IngredientCatalogItem[] {
  return INGREDIENT_CATALOG.filter((item) => item.markets.includes(market));
}

export function getIngredientCatalogMap(): Map<string, IngredientCatalogItem> {
  return new Map(INGREDIENT_CATALOG.map((item) => [item.ingredientKey, item]));
}
