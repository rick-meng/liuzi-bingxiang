import { MARKET_CONFIG } from "../data/marketConfig.js";
import { addPantryItem } from "../data/store.js";
import type { Market, PantryItem } from "../types/domain.js";
import type { PantryItemInput } from "../types/schemas.js";
import { createId } from "../utils/id.js";
import { normalizeIngredientName } from "../utils/ingredients.js";

export function createPantryItem(input: PantryItemInput, market: Market): PantryItem {
  const normalized = normalizeIngredientName(input.name);
  const config = MARKET_CONFIG[market];

  const pantryItem: PantryItem = {
    id: createId("pantry"),
    userId: input.userId,
    ingredientKey: normalized.key,
    nameZh: normalized.nameZh,
    nameEn: normalized.nameEn,
    aliases: normalized.aliases,
    quantity: input.quantity,
    unit: input.unit,
    storageType: input.storageType,
    openedAt: input.openedAt,
    expiresAt: input.expiresAt,
    purchasedAt: input.purchasedAt,
    price: input.price,
    currency: input.currency ?? config.currency
  };

  return addPantryItem(pantryItem);
}
