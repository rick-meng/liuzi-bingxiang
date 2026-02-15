import { MARKET_CONFIG } from "../data/marketConfig.js";
import { addPantryItem } from "../data/store.js";
import { createId } from "../utils/id.js";
import { normalizeIngredientName } from "../utils/ingredients.js";
export function createPantryItem(input, market) {
    const normalized = normalizeIngredientName(input.name);
    const config = MARKET_CONFIG[market];
    const pantryItem = {
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
