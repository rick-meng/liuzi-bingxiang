import { FOUNDATION_RECIPES } from "./foundationRecipes.js";
import { loadGeneratedData } from "../utils/generatedData.js";
function dedupeRecipes(recipes) {
    const seen = new Set();
    const output = [];
    for (const recipe of recipes) {
        if (seen.has(recipe.id)) {
            continue;
        }
        seen.add(recipe.id);
        output.push(recipe);
    }
    return output;
}
const generated = loadGeneratedData("recipes.generated.json", []);
export const RECIPES = dedupeRecipes([...FOUNDATION_RECIPES, ...generated]);
export function getRecipeById(recipeId) {
    return RECIPES.find((recipe) => recipe.id === recipeId);
}
