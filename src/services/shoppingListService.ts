import { getRecipeById } from "../data/recipes.js";
import { MARKET_CONFIG } from "../data/marketConfig.js";
import type { Market, PantryItem, ShoppingListItem } from "../types/domain.js";
import { safeRound } from "../utils/unitConversion.js";
import { computeRecipeMissingIngredients } from "./recommendationService.js";

interface ShoppingAggregation {
  ingredientKey: string;
  displayName: string;
  neededQty: number;
  unit: ShoppingListItem["unit"];
  sourceRecipeIds: Set<string>;
}

export function buildShoppingList(
  recipeIds: string[],
  pantry: PantryItem[],
  market: Market
): ShoppingListItem[] {
  const aggregation = new Map<string, ShoppingAggregation>();
  const marketConfig = MARKET_CONFIG[market];

  for (const recipeId of recipeIds) {
    const recipe = getRecipeById(recipeId);
    if (!recipe) {
      continue;
    }

    const missing = computeRecipeMissingIngredients(recipe, pantry);
    for (const ingredient of missing) {
      const existed = aggregation.get(ingredient.ingredientKey);
      if (existed && existed.unit === ingredient.unit) {
        existed.neededQty += ingredient.neededQuantity;
        existed.sourceRecipeIds.add(recipeId);
        continue;
      }

      aggregation.set(ingredient.ingredientKey, {
        ingredientKey: ingredient.ingredientKey,
        displayName: ingredient.nameZh,
        neededQty: ingredient.neededQuantity,
        unit: ingredient.unit,
        sourceRecipeIds: new Set([recipeId])
      });
    }
  }

  return [...aggregation.values()]
    .map((item) => ({
      ingredientKey: item.ingredientKey,
      displayName: item.displayName,
      neededQty: safeRound(item.neededQty),
      unit: item.unit,
      sourceRecipeIds: [...item.sourceRecipeIds],
      storeType: marketConfig.storeTypeByIngredient[item.ingredientKey] ?? "local",
      suggestedPackage: marketConfig.packageSuggestions[item.ingredientKey] ?? "standard pack",
      checked: false
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}
