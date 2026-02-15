import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { ZodError } from "zod";

import { MARKET_CONFIG } from "./data/marketConfig.js";
import { getIngredientCatalogByMarket } from "./data/ingredientCatalog.js";
import { getRecipeById } from "./data/recipes.js";
import { SETTINGS_SCHEMA, buildDefaultSettingsValues } from "./data/settingsSchema.js";
import {
  getPantryItemsByUser,
  getUserProfile,
  getUserSettings,
  removePantryItem,
  setUserProfile,
  updatePantryItem,
  upsertUserSettings
} from "./data/store.js";
import { buildExpiryAlerts } from "./services/alertService.js";
import { buildAIAssist } from "./services/aiAssistService.js";
import { createPantryItem } from "./services/pantryService.js";
import { recommendDinner } from "./services/recommendationService.js";
import { buildShoppingList } from "./services/shoppingListService.js";
import type { UserProfile } from "./types/domain.js";
import { loadGeneratedData } from "./utils/generatedData.js";
import {
  dinnerRecommendationRequestSchema,
  marketSchema,
  pantryItemInputSchema,
  pantryItemUpdateSchema,
  shoppingListRequestSchema,
  userProfileUpdateSchema,
  userSettingsUpsertSchema
} from "./types/schemas.js";

const buildReport = loadGeneratedData("buildReport.generated.json", {
  generatedAt: null,
  ingredientCount: 0,
  recipeCount: 0,
  rejectedRecipes: 0,
  notes: "Run npm run init:data to build initial dataset"
});

export function createApp() {
  const app = express();
  const frontendRoot = resolve(process.cwd(), "frontend");
  app.use(express.json());
  app.use(express.static(frontendRoot));

  function createDefaultProfile(
    userId: string,
    market: "NZ" | "AU",
    timezone: string
  ): UserProfile {
    return {
      id: userId,
      primaryMarket: market,
      timezone,
      currency: MARKET_CONFIG[market].currency,
      language: "zh-CN",
      dietPrefs: [],
      maxCookMinutes: 30
    };
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/catalog/ingredients", (req, res, next) => {
    try {
      const market = marketSchema.parse(req.query.market ?? "NZ");
      const items = getIngredientCatalogByMarket(market);
      res.json({
        market,
        count: items.length,
        items
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/catalog/build-report", (_req, res) => {
    res.json(buildReport);
  });

  app.post("/pantry/items", (req, res, next) => {
    try {
      const market = marketSchema.parse(req.query.market ?? "NZ");
      const payload = pantryItemInputSchema.parse(req.body);
      const created = createPantryItem(payload, market);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  app.get("/pantry/items", (req, res) => {
    const userId = String(req.query.userId ?? "");
    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    res.json(getPantryItemsByUser(userId));
  });

  app.patch("/pantry/items/:id", (req, res, next) => {
    try {
      const userId = String(req.query.userId ?? "");
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const patch = pantryItemUpdateSchema.parse(req.body);
      const updated = updatePantryItem(userId, req.params.id, patch);
      if (!updated) {
        res.status(404).json({ message: "Pantry item not found" });
        return;
      }

      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/pantry/items/:id", (req, res) => {
    const userId = String(req.query.userId ?? "");
    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    const removed = removePantryItem(userId, req.params.id);
    if (!removed) {
      res.status(404).json({ message: "Pantry item not found" });
      return;
    }

    res.status(204).send();
  });

  app.get("/users/me/profile", (req, res, next) => {
    try {
      const userId = String(req.query.userId ?? "");
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const market = marketSchema.parse(req.query.market ?? "NZ");
      const timezone = String(req.query.timezone ?? MARKET_CONFIG[market].defaultTimezone);
      const profile = getUserProfile(userId) ?? createDefaultProfile(userId, market, timezone);

      if (!getUserProfile(userId)) {
        setUserProfile(profile);
      }

      res.json(profile);
    } catch (error) {
      next(error);
    }
  });

  app.put("/users/me/profile", (req, res, next) => {
    try {
      const payload = userProfileUpdateSchema.parse(req.body);
      const market = payload.primaryMarket ?? marketSchema.parse(req.query.market ?? "NZ");

      const existing =
        getUserProfile(payload.userId) ??
        createDefaultProfile(
          payload.userId,
          market,
          payload.timezone ?? MARKET_CONFIG[market].defaultTimezone
        );

      const nextProfile: UserProfile = {
        ...existing,
        ...payload,
        id: payload.userId
      };

      if (payload.primaryMarket) {
        nextProfile.currency = MARKET_CONFIG[payload.primaryMarket].currency;
      }

      setUserProfile(nextProfile);
      res.json(nextProfile);
    } catch (error) {
      next(error);
    }
  });

  app.get("/settings/schema", (_req, res) => {
    res.json(SETTINGS_SCHEMA);
  });

  app.get("/users/me/settings", (req, res) => {
    const userId = String(req.query.userId ?? "");
    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    const defaults = buildDefaultSettingsValues();
    const current = getUserSettings(userId);
    res.json({
      values: {
        ...defaults,
        ...current
      }
    });
  });

  app.put("/users/me/settings", (req, res, next) => {
    try {
      const payload = userSettingsUpsertSchema.parse(req.body);
      const validKeys = new Set(SETTINGS_SCHEMA.fields.map((field) => field.key));
      const unknownKeys = Object.keys(payload.values).filter((key) => !validKeys.has(key));
      if (unknownKeys.length > 0) {
        res.status(400).json({
          message: "Unknown settings keys",
          keys: unknownKeys
        });
        return;
      }

      const updated = upsertUserSettings(payload.userId, payload.values);
      const defaults = buildDefaultSettingsValues();

      res.json({
        values: {
          ...defaults,
          ...updated
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/recommendations/dinner", (req, res, next) => {
    try {
      const request = dinnerRecommendationRequestSchema.parse(req.body);

      if (request.userProfile) {
        setUserProfile(request.userProfile);
      }

      const existingProfile = getUserProfile(request.userId);
      const profile: UserProfile =
        request.userProfile ??
        existingProfile ??
        createDefaultProfile(request.userId, request.market, request.timezone);

      if (!existingProfile) {
        setUserProfile(profile);
      }

      const pantryItems = getPantryItemsByUser(request.userId);
      const results = recommendDinner(pantryItems, profile, request.timezone);

      const withRecipeDetails = {
        full: results.full.map((item) => ({
          ...item,
          recipe: getRecipeById(item.recipeId)
        })),
        partial: results.partial.map((item) => ({
          ...item,
          recipe: getRecipeById(item.recipeId)
        })),
        expiryFirst: results.expiryFirst.map((item) => ({
          ...item,
          recipe: getRecipeById(item.recipeId)
        }))
      };

      res.json({
        profile,
        market: request.market,
        timezone: request.timezone,
        ...withRecipeDetails
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/recipes/:id", (req, res, next) => {
    try {
      const market = marketSchema.parse(req.query.market ?? "NZ");
      const recipe = getRecipeById(req.params.id);

      if (!recipe) {
        res.status(404).json({ message: "Recipe not found" });
        return;
      }

      res.json({
        recipe,
        aiAssist: buildAIAssist(recipe, market)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/shopping-list/from-recipes", (req, res, next) => {
    try {
      const request = shoppingListRequestSchema.parse(req.body);
      const pantryItems = getPantryItemsByUser(request.userId);
      const items = buildShoppingList(request.recipeIds, pantryItems, request.market);
      res.json({
        market: request.market,
        items
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/alerts/expiry", (req, res, next) => {
    try {
      const userId = String(req.query.userId ?? "");
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const market = marketSchema.parse(req.query.market ?? "NZ");
      const timezone = String(req.query.timezone ?? MARKET_CONFIG[market].defaultTimezone);
      const pantryItems = getPantryItemsByUser(userId);
      const alerts = buildExpiryAlerts(pantryItems, timezone);

      res.json({
        market,
        timezone,
        ...alerts
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        message: "Validation failed",
        errors: error.issues
      });
      return;
    }

    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: "Unknown error" });
  });

  return app;
}
