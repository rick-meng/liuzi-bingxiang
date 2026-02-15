export type Market = "NZ" | "AU";
export type Currency = "NZD" | "AUD";
export type UILanguage = "zh-CN" | "en-NZ";
export type StorageType = "fridge" | "freezer" | "pantry";

export interface UserProfile {
  id: string;
  primaryMarket: Market;
  timezone: string;
  currency: Currency;
  language: UILanguage;
  dietPrefs: string[];
  maxCookMinutes: number;
}

export interface PantryItem {
  id: string;
  userId: string;
  ingredientKey: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  quantity: number;
  unit: Unit;
  storageType: StorageType;
  openedAt?: string;
  expiresAt?: string;
  purchasedAt?: string;
  price?: number;
  currency?: Currency;
}

export type Unit =
  | "g"
  | "kg"
  | "ml"
  | "l"
  | "piece"
  | "pack"
  | "tbsp"
  | "tsp";

export interface RecipeIngredient {
  ingredientKey: string;
  nameZh: string;
  nameEn: string;
  quantity: number;
  unit: Unit;
  optional?: boolean;
}

export interface RecipeSubstitution {
  ingredientKey: string;
  markets: Market[];
  alternatives: {
    ingredientKey: string;
    nameZh: string;
    nameEn: string;
    note: string;
  }[];
}

export interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  servings: number;
  cookMinutes: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: string[];
  substitutions: RecipeSubstitution[];
}

export interface MissingIngredient {
  ingredientKey: string;
  nameZh: string;
  nameEn: string;
  neededQuantity: number;
  unit: Unit;
  availableQuantity: number;
}

export type MatchType = "full" | "partial" | "expiry_first";

export interface SubstitutionPlan {
  forIngredientKey: string;
  alternatives: {
    ingredientKey: string;
    nameZh: string;
    nameEn: string;
    note: string;
  }[];
}

export interface RecipeMatchResult {
  recipeId: string;
  matchType: MatchType;
  coverageScore: number;
  missingIngredients: MissingIngredient[];
  substitutionPlan: SubstitutionPlan[];
  totalScore: number;
}

export type StoreType = "asian" | "local";

export interface ShoppingListItem {
  ingredientKey: string;
  displayName: string;
  neededQty: number;
  unit: Unit;
  sourceRecipeIds: string[];
  storeType: StoreType;
  suggestedPackage: string;
  checked: boolean;
}

export type IngredientChannel = "nz_mainstream" | "nz_asian";

export interface IngredientSupplySignal {
  source: string;
  confidence: number;
  evidence: string[];
}

export interface IngredientCatalogItem {
  ingredientKey: string;
  nameZh: string;
  nameEn: string;
  aliases: string[];
  category:
    | "staple"
    | "protein"
    | "vegetable"
    | "aromatics"
    | "sauce"
    | "seasoning";
  storageType: StorageType;
  typicalUnits: Unit[];
  channels: IngredientChannel[];
  markets: Market[];
  supplySignals: IngredientSupplySignal[];
}

export type SettingsFieldType =
  | "boolean"
  | "single_select"
  | "multi_select"
  | "number"
  | "time"
  | "text";

export interface SettingsSchemaOption {
  value: string;
  labels: {
    zh: string;
    en: string;
  };
}

export interface SettingsVisibilityRule {
  key: string;
  equals: string | number | boolean;
}

export interface SettingsSchemaField {
  key: string;
  type: SettingsFieldType;
  section: "language_region" | "cooking_preferences" | "notifications" | "more_personalization";
  labels: {
    zh: string;
    en: string;
  };
  description?: {
    zh: string;
    en: string;
  };
  options?: SettingsSchemaOption[];
  default: string | number | boolean | string[];
  validations?: {
    min?: number;
    max?: number;
    maxLength?: number;
  };
  visibleWhen?: SettingsVisibilityRule;
}

export interface SettingsSchemaResponse {
  sections: {
    key: "language_region" | "cooking_preferences" | "notifications" | "more_personalization";
    labels: {
      zh: string;
      en: string;
    };
  }[];
  fields: SettingsSchemaField[];
}

export type SettingsValues = Record<string, string | number | boolean | string[]>;

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
}

export type IdentityProvider = "email_password" | "wechat_miniprogram";

export interface UserIdentity {
  id: string;
  userId: string;
  provider: IdentityProvider;
  providerUid: string;
  unionId?: string;
  openId?: string;
  appId?: string;
  createdAt: string;
  updatedAt: string;
}
