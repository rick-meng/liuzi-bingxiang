import type {
  IngredientCatalogItem,
  IngredientChannel,
  IngredientSupplySignal
} from "../types/domain.js";
import type { IngredientSeedItem } from "../data/ingredientSeed.js";

function findEvidence(phrases: string[], keywords: string[]): string[] {
  const matches = phrases.filter((phrase) =>
    keywords.some((keyword) => phrase.includes(keyword.toLowerCase()))
  );

  return [...new Set(matches)].slice(0, 8);
}

function buildSignal(
  source: string,
  evidence: string[],
  minConfidence: number
): IngredientSupplySignal | null {
  if (evidence.length === 0) {
    return null;
  }

  const confidence = Math.min(1, minConfidence + evidence.length * 0.08);

  return {
    source,
    confidence: Number(confidence.toFixed(2)),
    evidence: evidence.slice(0, 3)
  };
}

function pickChannels(seed: IngredientSeedItem, hasMainstreamSignal: boolean, hasAsianSignal: boolean): IngredientChannel[] {
  const channels = new Set<IngredientChannel>(seed.defaultChannels);

  if (hasMainstreamSignal) {
    channels.add("nz_mainstream");
  }

  if (hasAsianSignal) {
    channels.add("nz_asian");
  }

  return [...channels];
}

export function buildIngredientCatalog(
  seedItems: IngredientSeedItem[],
  signals: {
    mainstreamPhrases: string[];
    asianPhrases: string[];
  }
): IngredientCatalogItem[] {
  const catalog: IngredientCatalogItem[] = [];

  for (const seed of seedItems) {
    const mainstreamEvidence = findEvidence(signals.mainstreamPhrases, seed.keywords);
    const asianEvidence = findEvidence(signals.asianPhrases, seed.keywords);

    const hasMainstreamSignal = mainstreamEvidence.length > 0;
    const hasAsianSignal = asianEvidence.length > 0;
    const shouldInclude =
      seed.core || hasMainstreamSignal || hasAsianSignal || seed.defaultChannels.length > 0;

    if (!shouldInclude) {
      continue;
    }

    const supplySignals: IngredientSupplySignal[] = [];

    const mainstreamSignal = buildSignal("nz_supermarket_sitemaps", mainstreamEvidence, 0.35);
    if (mainstreamSignal) {
      supplySignals.push(mainstreamSignal);
    }

    const asianSignal = buildSignal("nz_asian_supermarket_departments", asianEvidence, 0.4);
    if (asianSignal) {
      supplySignals.push(asianSignal);
    }

    catalog.push({
      ingredientKey: seed.ingredientKey,
      nameZh: seed.nameZh,
      nameEn: seed.nameEn,
      aliases: [...new Set(seed.aliases)],
      category: seed.category,
      storageType: seed.storageType,
      typicalUnits: seed.typicalUnits,
      channels: pickChannels(seed, hasMainstreamSignal, hasAsianSignal),
      markets: seed.markets,
      supplySignals
    });
  }

  return catalog.sort((left, right) => left.ingredientKey.localeCompare(right.ingredientKey));
}
