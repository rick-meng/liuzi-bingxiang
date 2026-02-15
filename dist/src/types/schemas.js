import { z } from "zod";
export const marketSchema = z.enum(["NZ", "AU"]);
export const currencySchema = z.enum(["NZD", "AUD"]);
export const languageSchema = z.enum(["zh-CN", "en-NZ"]);
export const storageTypeSchema = z.enum(["fridge", "freezer", "pantry"]);
export const unitSchema = z.enum([
    "g",
    "kg",
    "ml",
    "l",
    "piece",
    "pack",
    "tbsp",
    "tsp"
]);
export const userProfileSchema = z.object({
    id: z.string().min(1),
    primaryMarket: marketSchema,
    timezone: z.string().min(1),
    currency: currencySchema,
    language: languageSchema.default("zh-CN"),
    dietPrefs: z.array(z.string()).default([]),
    maxCookMinutes: z.number().int().positive().max(180)
});
export const userProfileUpdateSchema = z.object({
    userId: z.string().min(1),
    primaryMarket: marketSchema.optional(),
    timezone: z.string().min(1).optional(),
    language: languageSchema.optional(),
    dietPrefs: z.array(z.string()).optional(),
    maxCookMinutes: z.number().int().positive().max(180).optional()
});
export const pantryItemInputSchema = z.object({
    userId: z.string().min(1),
    name: z.string().min(1),
    quantity: z.number().positive(),
    unit: unitSchema,
    storageType: storageTypeSchema,
    openedAt: z.string().datetime({ offset: true }).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    purchasedAt: z.string().datetime({ offset: true }).optional(),
    price: z.number().positive().optional(),
    currency: currencySchema.optional()
});
export const pantryItemUpdateSchema = z
    .object({
    quantity: z.number().positive().optional(),
    storageType: storageTypeSchema.optional(),
    openedAt: z.string().datetime({ offset: true }).nullable().optional(),
    expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
    purchasedAt: z.string().datetime({ offset: true }).nullable().optional()
})
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided"
});
export const dinnerRecommendationRequestSchema = z.object({
    userId: z.string().min(1),
    market: marketSchema,
    timezone: z.string().min(1),
    userProfile: userProfileSchema.optional()
});
export const shoppingListRequestSchema = z.object({
    userId: z.string().min(1),
    market: marketSchema,
    recipeIds: z.array(z.string().min(1)).min(1)
});
export const userSettingsUpsertSchema = z.object({
    userId: z.string().min(1),
    values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
});
