import { INGREDIENT_CATALOG } from "../data/ingredientCatalog.js";

interface IngredientLexiconEntry {
  key: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
}

const LEXICON: IngredientLexiconEntry[] = INGREDIENT_CATALOG.map((item) => ({
  key: item.ingredientKey,
  nameZh: item.nameZh,
  nameEn: item.nameEn,
  aliases: item.aliases
}));

const aliasIndex = new Map<string, IngredientLexiconEntry>();
for (const entry of LEXICON) {
  aliasIndex.set(entry.key, entry);
  for (const alias of entry.aliases) {
    aliasIndex.set(alias.trim().toLowerCase(), entry);
  }
}

export function normalizeIngredientName(rawName: string): IngredientLexiconEntry {
  const key = rawName.trim().toLowerCase();
  const match = aliasIndex.get(key);
  if (match) {
    return match;
  }

  return {
    key: key.replace(/\s+/g, "_"),
    nameZh: rawName.trim(),
    nameEn: rawName.trim(),
    aliases: [rawName.trim()]
  };
}

export function getIngredientDisplayName(ingredientKey: string): {
  nameZh: string;
  nameEn: string;
} {
  const entry = aliasIndex.get(ingredientKey);
  if (entry) {
    return {
      nameZh: entry.nameZh,
      nameEn: entry.nameEn
    };
  }

  return {
    nameZh: ingredientKey,
    nameEn: ingredientKey
  };
}
