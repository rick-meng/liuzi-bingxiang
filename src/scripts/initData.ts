import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { INGREDIENT_SEED } from "../data/ingredientSeed.js";
import { FOUNDATION_RECIPES } from "../data/foundationRecipes.js";
import { buildIngredientCatalog } from "../pipeline/ingredientCatalogBuilder.js";
import { generateConstrainedRecipes } from "../pipeline/menuGenerator.js";
import { runRecipeQualityGate } from "../pipeline/qualityGate.js";
import { collectNZStoreSignals } from "../pipeline/sourceCollector.js";

interface BuildReport {
  generatedAt: string;
  ingredientCount: number;
  recipeCount: number;
  rejectedRecipes: number;
  notes: string;
}

function toPrettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeGeneratedFile(filename: string, payload: unknown): Promise<void> {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = path.resolve(dirname, "../data/generated");
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, filename), toPrettyJson(payload), "utf8");
}

async function main(): Promise<void> {
  const signals = await collectNZStoreSignals();
  const catalog = buildIngredientCatalog(INGREDIENT_SEED, signals);
  const generatedRecipes = generateConstrainedRecipes(catalog, {
    targetCount: 140,
    maxCookMinutes: 40
  });

  const quality = runRecipeQualityGate(generatedRecipes, catalog);

  const report: BuildReport = {
    generatedAt: new Date().toISOString(),
    ingredientCount: catalog.length,
    recipeCount: quality.accepted.length,
    rejectedRecipes: quality.rejected.length,
    notes:
      "Catalog built from NZ supermarket sitemap signals + NZ asian supermarket departments, then constrained recipe generation and quality gate."
  };

  await writeGeneratedFile("sourceSnapshot.generated.json", signals.snapshot);
  await writeGeneratedFile("ingredientCatalog.generated.json", catalog);
  await writeGeneratedFile("recipes.generated.json", quality.accepted);
  await writeGeneratedFile("buildReport.generated.json", report);

  // eslint-disable-next-line no-console
  console.log(
    `Initialized data: ${catalog.length} ingredients, ${quality.accepted.length} generated recipes, ${FOUNDATION_RECIPES.length} foundation recipes.`
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
