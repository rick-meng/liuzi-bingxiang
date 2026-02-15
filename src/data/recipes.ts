import { FOUNDATION_RECIPES } from "./foundationRecipes.js";
import type { Recipe } from "../types/domain.js";
import { loadGeneratedData } from "../utils/generatedData.js";

function dedupeRecipes(recipes: Recipe[]): Recipe[] {
  const seen = new Set<string>();
  const output: Recipe[] = [];

  for (const recipe of recipes) {
    if (seen.has(recipe.id)) {
      continue;
    }
    seen.add(recipe.id);
    output.push(recipe);
  }

  return output;
}

const generated = loadGeneratedData<Recipe[]>("recipes.generated.json", []);

export const RECIPES: Recipe[] = dedupeRecipes([...FOUNDATION_RECIPES, ...generated]);

export function getRecipeById(recipeId: string): Recipe | undefined {
  return RECIPES.find((recipe) => recipe.id === recipeId);
}
