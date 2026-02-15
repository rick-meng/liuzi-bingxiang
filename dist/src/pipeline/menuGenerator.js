import { createHash } from "node:crypto";
const DEFAULT_OPTIONS = {
    targetCount: 120,
    maxCookMinutes: 35
};
const SUBSTITUTION_RULES = {
    shaoxing_wine: [
        {
            ingredientKey: "dry_sherry",
            nameZh: "干雪利酒",
            nameEn: "dry sherry",
            note: "NZ/AU 本地超市酒类货架可替代"
        }
    ],
    doubanjiang: [
        {
            ingredientKey: "chili_bean_paste",
            nameZh: "辣豆瓣酱",
            nameEn: "chili bean paste",
            note: "亚洲超市常见替代"
        }
    ],
    bok_choy: [
        {
            ingredientKey: "choy_sum",
            nameZh: "菜心",
            nameEn: "choy sum",
            note: "NZ 华人超市常见叶菜替代"
        }
    ]
};
function groupByCategory(catalog) {
    return {
        staples: catalog.filter((item) => item.category === "staple"),
        proteins: catalog.filter((item) => item.category === "protein"),
        vegetables: catalog.filter((item) => item.category === "vegetable"),
        aromatics: catalog.filter((item) => item.category === "aromatics"),
        sauces: catalog.filter((item) => item.category === "sauce")
    };
}
function chooseUnit(candidateUnits, preferred) {
    const match = preferred.find((unit) => candidateUnits.includes(unit));
    return match ?? candidateUnits[0] ?? "g";
}
function quantityFor(item, unit) {
    if (item.category === "protein") {
        if (unit === "g")
            return 260;
        if (unit === "piece")
            return item.ingredientKey === "egg" ? 2 : 1;
        return 1;
    }
    if (item.category === "vegetable") {
        if (unit === "g")
            return 200;
        if (unit === "piece")
            return 1;
        return 1;
    }
    if (item.category === "aromatics") {
        if (unit === "g")
            return 10;
        if (unit === "piece")
            return 2;
        return 1;
    }
    if (item.category === "sauce") {
        if (unit === "tbsp")
            return 1;
        if (unit === "tsp")
            return 1;
        if (unit === "ml")
            return 15;
        return 1;
    }
    if (item.ingredientKey === "rice") {
        return unit === "g" ? 250 : 1;
    }
    if (item.ingredientKey === "noodles") {
        return unit === "g" ? 120 : 1;
    }
    return unit === "g" ? 100 : 1;
}
function ingredientFromCatalog(item, preferredUnits, optional = false) {
    const unit = chooseUnit(item.typicalUnits, preferredUnits);
    return {
        ingredientKey: item.ingredientKey,
        nameZh: item.nameZh,
        nameEn: item.nameEn,
        quantity: quantityFor(item, unit),
        unit,
        optional
    };
}
function toRecipeId(seed) {
    const digest = createHash("sha1").update(seed).digest("hex").slice(0, 10);
    return `g_${digest}`;
}
function buildSubstitutions(ingredients) {
    const substitutions = [];
    for (const ingredient of ingredients) {
        const alternatives = SUBSTITUTION_RULES[ingredient.ingredientKey];
        if (!alternatives || alternatives.length === 0) {
            continue;
        }
        substitutions.push({
            ingredientKey: ingredient.ingredientKey,
            markets: ["NZ", "AU"],
            alternatives
        });
    }
    return substitutions;
}
function buildTags(ingredients, cookMinutes) {
    const tags = new Set();
    if (cookMinutes <= 20) {
        tags.add("quick");
    }
    if (ingredients.some((item) => item.ingredientKey === "chili" || item.ingredientKey === "doubanjiang")) {
        tags.add("spicy");
    }
    if (ingredients.some((item) => item.ingredientKey === "tofu_firm") &&
        !ingredients.some((item) => item.ingredientKey.includes("beef") || item.ingredientKey.includes("pork"))) {
        tags.add("veggie");
    }
    tags.add("nz-au");
    return [...tags];
}
function buildStirFryRecipe(protein, vegetable, aromatics, sauces) {
    const garlic = aromatics.find((item) => item.ingredientKey === "garlic") ?? aromatics[0];
    const ginger = aromatics.find((item) => item.ingredientKey === "ginger") ?? aromatics[1] ?? garlic;
    const soy = sauces.find((item) => item.ingredientKey === "soy_sauce") ?? sauces[0];
    const oyster = sauces.find((item) => item.ingredientKey === "oyster_sauce");
    const ingredients = [
        ingredientFromCatalog(protein, ["g", "piece"]),
        ingredientFromCatalog(vegetable, ["g", "piece"]),
        ingredientFromCatalog(garlic, ["piece", "g"]),
        ingredientFromCatalog(ginger, ["g", "piece"]),
        ingredientFromCatalog(soy, ["tbsp", "ml"]),
        oyster ? ingredientFromCatalog(oyster, ["tbsp", "ml"], true) : undefined
    ].filter((item) => item !== undefined);
    const title = `${protein.nameZh}${vegetable.nameZh}快炒`;
    return {
        id: toRecipeId(`stirfry:${protein.ingredientKey}:${vegetable.ingredientKey}`),
        title,
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 16,
        ingredients,
        steps: [
            `${protein.nameZh}切小块并简单腌制。`,
            `热锅下${garlic.nameZh}与${ginger.nameZh}爆香，加入${protein.nameZh}翻炒至变色。`,
            `加入${vegetable.nameZh}和调味料大火快炒，收汁后出锅。`
        ],
        tags: buildTags(ingredients, 16),
        substitutions: buildSubstitutions(ingredients)
    };
}
function buildRiceBowlRecipe(protein, vegetable, staples, sauces) {
    const rice = staples.find((item) => item.ingredientKey === "rice");
    const soy = sauces.find((item) => item.ingredientKey === "soy_sauce") ?? sauces[0];
    const sesame = sauces.find((item) => item.ingredientKey === "sesame_oil");
    if (!rice || !soy) {
        return null;
    }
    const ingredients = [
        ingredientFromCatalog(rice, ["g", "kg"]),
        ingredientFromCatalog(protein, ["g", "piece"]),
        ingredientFromCatalog(vegetable, ["g", "piece"]),
        ingredientFromCatalog(soy, ["tbsp", "ml"]),
        sesame ? ingredientFromCatalog(sesame, ["tsp", "tbsp"], true) : undefined
    ].filter((item) => item !== undefined);
    const title = `${protein.nameZh}${vegetable.nameZh}盖饭`;
    return {
        id: toRecipeId(`ricebowl:${protein.ingredientKey}:${vegetable.ingredientKey}`),
        title,
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 22,
        ingredients,
        steps: [
            `米饭煮好备用。`,
            `将${protein.nameZh}炒熟后加入${vegetable.nameZh}继续翻炒。`,
            `加入调味料收汁，浇在热米饭上即可。`
        ],
        tags: buildTags(ingredients, 22),
        substitutions: buildSubstitutions(ingredients)
    };
}
function buildNoodleRecipe(protein, vegetable, staples, sauces) {
    const noodles = staples.find((item) => item.ingredientKey === "noodles");
    const soy = sauces.find((item) => item.ingredientKey === "soy_sauce") ?? sauces[0];
    if (!noodles || !soy) {
        return null;
    }
    const ingredients = [
        ingredientFromCatalog(noodles, ["g", "pack"]),
        ingredientFromCatalog(protein, ["g", "piece"]),
        ingredientFromCatalog(vegetable, ["g", "piece"]),
        ingredientFromCatalog(soy, ["tbsp", "ml"])
    ];
    const title = `${protein.nameZh}${vegetable.nameZh}拌面`;
    return {
        id: toRecipeId(`noodle:${protein.ingredientKey}:${vegetable.ingredientKey}`),
        title,
        cuisine: "Chinese Home",
        servings: 1,
        cookMinutes: 14,
        ingredients,
        steps: [
            `面条煮熟后过冷水备用。`,
            `将${protein.nameZh}和${vegetable.nameZh}炒熟，加入调味料。`,
            `与面条拌匀，快速翻炒 1 分钟后出锅。`
        ],
        tags: buildTags(ingredients, 14),
        substitutions: buildSubstitutions(ingredients)
    };
}
function buildTofuRecipe(vegetables, sauces) {
    const tofu = vegetables.find((item) => item.ingredientKey === "tofu_firm");
    const doubanjiang = sauces.find((item) => item.ingredientKey === "doubanjiang");
    const soy = sauces.find((item) => item.ingredientKey === "soy_sauce") ?? sauces[0];
    if (!tofu || !soy) {
        return null;
    }
    const ingredients = [
        ingredientFromCatalog(tofu, ["g", "pack"]),
        ingredientFromCatalog(soy, ["tbsp", "ml"]),
        doubanjiang ? ingredientFromCatalog(doubanjiang, ["tbsp", "g"], true) : undefined
    ].filter((item) => item !== undefined);
    return {
        id: toRecipeId("tofu:home-style"),
        title: "家常烧豆腐",
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 15,
        ingredients,
        steps: [
            "豆腐切块并煎至表面定型。",
            "加入生抽和少量清水，小火焖煮入味。",
            "按口味加入辣豆瓣或葱花，收汁出锅。"
        ],
        tags: buildTags(ingredients, 15),
        substitutions: buildSubstitutions(ingredients)
    };
}
function dedupeRecipes(recipes) {
    const byFingerprint = new Map();
    for (const recipe of recipes) {
        const fingerprint = `${recipe.title}|${recipe.ingredients
            .filter((item) => !item.optional)
            .map((item) => item.ingredientKey)
            .sort()
            .join(",")}`;
        if (!byFingerprint.has(fingerprint)) {
            byFingerprint.set(fingerprint, recipe);
        }
    }
    return [...byFingerprint.values()];
}
export function generateConstrainedRecipes(catalog, overrideOptions) {
    const options = {
        ...DEFAULT_OPTIONS,
        ...overrideOptions
    };
    const grouped = groupByCategory(catalog);
    const recipes = [];
    const stirFryProteins = grouped.proteins.filter((item) => item.ingredientKey !== "egg");
    const stirFryVeggies = grouped.vegetables.filter((item) => item.ingredientKey !== "potato");
    for (const protein of stirFryProteins) {
        for (const vegetable of stirFryVeggies) {
            recipes.push(buildStirFryRecipe(protein, vegetable, grouped.aromatics, grouped.sauces));
            const bowlRecipe = buildRiceBowlRecipe(protein, vegetable, grouped.staples, grouped.sauces);
            if (bowlRecipe) {
                recipes.push(bowlRecipe);
            }
            const noodleRecipe = buildNoodleRecipe(protein, vegetable, grouped.staples, grouped.sauces);
            if (noodleRecipe) {
                recipes.push(noodleRecipe);
            }
            if (recipes.length >= options.targetCount * 2) {
                break;
            }
        }
        if (recipes.length >= options.targetCount * 2) {
            break;
        }
    }
    const tofuRecipe = buildTofuRecipe([...grouped.proteins, ...grouped.vegetables], grouped.sauces);
    if (tofuRecipe) {
        recipes.push(tofuRecipe);
    }
    const deduped = dedupeRecipes(recipes)
        .filter((recipe) => recipe.cookMinutes <= options.maxCookMinutes)
        .slice(0, options.targetCount);
    return deduped;
}
