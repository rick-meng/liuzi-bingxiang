import { describe, expect, it } from "vitest";
import { INGREDIENT_SEED } from "../src/data/ingredientSeed.js";
import { buildIngredientCatalog } from "../src/pipeline/ingredientCatalogBuilder.js";
import { generateConstrainedRecipes } from "../src/pipeline/menuGenerator.js";
import { runRecipeQualityGate } from "../src/pipeline/qualityGate.js";
describe("initialization pipeline", () => {
    it("builds ingredient catalog with NZ mainstream and asian signals", () => {
        const catalog = buildIngredientCatalog(INGREDIENT_SEED, {
            mainstreamPhrases: [
                "nz beef mince",
                "soy sauce",
                "spring onion",
                "jasmine rice"
            ],
            asianPhrases: ["asian grocery", "hong kong bbq", "bok choy"]
        });
        const soy = catalog.find((item) => item.ingredientKey === "soy_sauce");
        const bokChoy = catalog.find((item) => item.ingredientKey === "bok_choy");
        expect(soy).toBeDefined();
        expect(soy?.channels).toContain("nz_mainstream");
        expect(soy?.supplySignals.some((signal) => signal.source === "nz_supermarket_sitemaps")).toBe(true);
        expect(bokChoy).toBeDefined();
        expect(bokChoy?.channels).toContain("nz_asian");
    });
    it("generates constrained menus and passes quality gate", () => {
        const catalog = buildIngredientCatalog(INGREDIENT_SEED, {
            mainstreamPhrases: ["beef mince", "chicken thigh", "soy sauce", "cabbage", "rice", "noodles"],
            asianPhrases: ["asian grocery", "bok choy", "hong kong bbq"]
        });
        const generated = generateConstrainedRecipes(catalog, {
            targetCount: 24,
            maxCookMinutes: 30
        });
        expect(generated.length).toBeGreaterThan(0);
        const quality = runRecipeQualityGate(generated, catalog);
        expect(quality.accepted.length).toBeGreaterThan(0);
        expect(quality.accepted.every((recipe) => recipe.steps.length >= 3)).toBe(true);
        expect(quality.accepted.every((recipe) => recipe.cookMinutes <= 30)).toBe(true);
    });
});
