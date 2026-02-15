export function buildAIAssist(recipe, market) {
    const substitutionHints = recipe.substitutions
        .filter((item) => item.markets.includes(market))
        .flatMap((item) => item.alternatives.map((alt) => `${item.ingredientKey} -> ${alt.nameZh}/${alt.nameEn} (${alt.note})`));
    const quickVersion = recipe.steps.slice(0, 2);
    if (recipe.steps.length > 2) {
        quickVersion.push("最后统一调味并收汁 1-2 分钟后出锅。");
    }
    return {
        quickVersion,
        substitutionHints
    };
}
