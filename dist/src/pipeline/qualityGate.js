function jaccardSimilarity(left, right) {
    const leftSet = new Set(left);
    const rightSet = new Set(right);
    let intersection = 0;
    for (const value of leftSet) {
        if (rightSet.has(value)) {
            intersection += 1;
        }
    }
    const union = new Set([...leftSet, ...rightSet]).size;
    if (union === 0) {
        return 0;
    }
    return intersection / union;
}
function validateRecipe(recipe, knownIngredients) {
    const reasons = [];
    if (!recipe.title || recipe.title.trim().length < 3) {
        reasons.push("title_too_short");
    }
    if (recipe.cookMinutes < 8 || recipe.cookMinutes > 45) {
        reasons.push("cook_minutes_out_of_range");
    }
    if (recipe.steps.length < 3 || recipe.steps.length > 6) {
        reasons.push("step_count_out_of_range");
    }
    const requiredIngredients = recipe.ingredients.filter((item) => !item.optional);
    if (requiredIngredients.length < 3 || requiredIngredients.length > 8) {
        reasons.push("required_ingredient_count_out_of_range");
    }
    const keys = recipe.ingredients.map((item) => item.ingredientKey);
    const uniqueKeyCount = new Set(keys).size;
    if (uniqueKeyCount !== keys.length) {
        reasons.push("duplicated_ingredient_keys");
    }
    const unknownKeys = keys.filter((key) => !knownIngredients.has(key));
    if (unknownKeys.length > 0) {
        reasons.push("unknown_ingredient_keys");
    }
    return reasons;
}
export function runRecipeQualityGate(recipes, catalog) {
    const knownIngredients = new Set(catalog.map((item) => item.ingredientKey));
    const accepted = [];
    const rejected = [];
    for (const recipe of recipes) {
        const reasons = validateRecipe(recipe, knownIngredients);
        const requiredKeys = recipe.ingredients
            .filter((item) => !item.optional)
            .map((item) => item.ingredientKey)
            .sort();
        const highlySimilar = accepted.some((existing) => {
            const existingKeys = existing.ingredients
                .filter((item) => !item.optional)
                .map((item) => item.ingredientKey)
                .sort();
            return jaccardSimilarity(requiredKeys, existingKeys) >= 0.86;
        });
        if (highlySimilar) {
            reasons.push("too_similar_to_existing");
        }
        if (reasons.length > 0) {
            rejected.push({
                recipeId: recipe.id,
                title: recipe.title,
                reasons
            });
            continue;
        }
        accepted.push(recipe);
    }
    return {
        accepted,
        rejected
    };
}
