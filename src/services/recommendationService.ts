import { DateTime } from "luxon";

import { RECIPES } from "../data/recipes.js";
import type {
  MatchType,
  MissingIngredient,
  PantryItem,
  Recipe,
  RecipeMatchResult,
  SubstitutionPlan,
  Unit,
  UserProfile
} from "../types/domain.js";
import { getIngredientDisplayName } from "../utils/ingredients.js";
import { convertUnit, safeRound } from "../utils/unitConversion.js";

const WEIGHTS = {
  coverage: 0.4,
  expiry: 0.25,
  time: 0.2,
  preference: 0.15
};

interface RecipeEvaluation {
  matchResult: RecipeMatchResult;
  recipe: Recipe;
}

interface RecommendationOutput {
  full: RecipeMatchResult[];
  partial: RecipeMatchResult[];
  expiryFirst: RecipeMatchResult[];
}

function getPantryQuantity(
  pantry: PantryItem[],
  ingredientKey: string,
  targetUnit: Unit
): number {
  let quantity = 0;
  for (const item of pantry) {
    if (item.ingredientKey !== ingredientKey) {
      continue;
    }

    const converted = convertUnit(item.quantity, item.unit, targetUnit);
    if (converted !== null) {
      quantity += converted;
    }
  }
  return quantity;
}

function isExpiringSoon(item: PantryItem, timezone: string, now: DateTime): boolean {
  if (!item.expiresAt) {
    return false;
  }
  const expiry = DateTime.fromISO(item.expiresAt, { zone: timezone });
  if (!expiry.isValid) {
    return false;
  }

  const diffDays = expiry.startOf("day").diff(now.startOf("day"), "days").days;
  return diffDays >= 0 && diffDays <= 3;
}

function buildSubstitutionPlan(
  recipe: Recipe,
  missingIngredientKeys: Set<string>,
  market: UserProfile["primaryMarket"]
): SubstitutionPlan[] {
  return recipe.substitutions
    .filter(
      (candidate) =>
        missingIngredientKeys.has(candidate.ingredientKey) && candidate.markets.includes(market)
    )
    .map((candidate) => ({
      forIngredientKey: candidate.ingredientKey,
      alternatives: candidate.alternatives
    }));
}

function evaluateRecipe(
  recipe: Recipe,
  pantry: PantryItem[],
  profile: UserProfile,
  timezone: string,
  now: DateTime
): RecipeEvaluation | null {
  const requiredIngredients = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  if (requiredIngredients.length === 0) {
    return null;
  }

  const missingIngredients: MissingIngredient[] = [];
  let coverageAccumulator = 0;
  let expiringUsageCount = 0;

  for (const ingredient of requiredIngredients) {
    const available = getPantryQuantity(pantry, ingredient.ingredientKey, ingredient.unit);
    const ingredientCoverage = Math.max(
      0,
      Math.min(1, available / Math.max(ingredient.quantity, 0.0001))
    );
    coverageAccumulator += ingredientCoverage;

    if (available < ingredient.quantity) {
      const display = getIngredientDisplayName(ingredient.ingredientKey);
      missingIngredients.push({
        ingredientKey: ingredient.ingredientKey,
        nameZh: display.nameZh,
        nameEn: display.nameEn,
        neededQuantity: safeRound(ingredient.quantity),
        unit: ingredient.unit,
        availableQuantity: safeRound(available)
      });
    }

    if (available > 0) {
      const ingredientItems = pantry.filter((item) => item.ingredientKey === ingredient.ingredientKey);
      if (ingredientItems.some((item) => isExpiringSoon(item, timezone, now))) {
        expiringUsageCount += 1;
      }
    }
  }

  const coverageScore = coverageAccumulator / requiredIngredients.length;
  const missingCount = missingIngredients.length;

  if (missingCount > 2) {
    return null;
  }

  if (recipe.cookMinutes > profile.maxCookMinutes) {
    return null;
  }

  const expiryScore = expiringUsageCount / requiredIngredients.length;
  const timeScore =
    recipe.cookMinutes <= profile.maxCookMinutes
      ? 1
      : Math.max(
          0,
          1 -
            (recipe.cookMinutes - profile.maxCookMinutes) /
              Math.max(profile.maxCookMinutes, 1)
        );

  const preferenceScore =
    profile.dietPrefs.length === 0
      ? 1
      : recipe.tags.filter((tag) => profile.dietPrefs.includes(tag)).length /
        profile.dietPrefs.length;

  const totalScore =
    coverageScore * WEIGHTS.coverage +
    expiryScore * WEIGHTS.expiry +
    timeScore * WEIGHTS.time +
    preferenceScore * WEIGHTS.preference;

  let matchType: MatchType;
  if (expiryScore > 0 && missingCount <= 2) {
    matchType = "expiry_first";
  } else if (missingCount === 0) {
    matchType = "full";
  } else {
    matchType = "partial";
  }

  const substitutionPlan = buildSubstitutionPlan(
    recipe,
    new Set(missingIngredients.map((item) => item.ingredientKey)),
    profile.primaryMarket
  );

  return {
    recipe,
    matchResult: {
      recipeId: recipe.id,
      matchType,
      coverageScore: safeRound(coverageScore, 3),
      missingIngredients,
      substitutionPlan,
      totalScore: safeRound(totalScore, 3)
    }
  };
}

export function recommendDinner(
  pantry: PantryItem[],
  profile: UserProfile,
  timezone: string,
  now = DateTime.now().setZone(timezone)
): RecommendationOutput {
  const evaluations = RECIPES.map((recipe) =>
    evaluateRecipe(recipe, pantry, profile, timezone, now)
  ).filter((item): item is RecipeEvaluation => item !== null);

  const sorted = evaluations.sort(
    (left, right) => right.matchResult.totalScore - left.matchResult.totalScore
  );

  const output: RecommendationOutput = {
    full: [],
    partial: [],
    expiryFirst: []
  };

  for (const item of sorted) {
    if (item.matchResult.matchType === "full") {
      output.full.push(item.matchResult);
    } else if (item.matchResult.matchType === "partial") {
      output.partial.push(item.matchResult);
    } else {
      output.expiryFirst.push(item.matchResult);
    }
  }

  return output;
}

export function computeRecipeMissingIngredients(
  recipe: Recipe,
  pantry: PantryItem[]
): MissingIngredient[] {
  const missingIngredients: MissingIngredient[] = [];
  const requiredIngredients = recipe.ingredients.filter((ingredient) => !ingredient.optional);

  for (const ingredient of requiredIngredients) {
    const available = getPantryQuantity(pantry, ingredient.ingredientKey, ingredient.unit);
    if (available < ingredient.quantity) {
      const display = getIngredientDisplayName(ingredient.ingredientKey);
      missingIngredients.push({
        ingredientKey: ingredient.ingredientKey,
        nameZh: display.nameZh,
        nameEn: display.nameEn,
        neededQuantity: safeRound(ingredient.quantity - available),
        availableQuantity: safeRound(available),
        unit: ingredient.unit
      });
    }
  }

  return missingIngredients;
}
