import express, { type Request, type Response } from "express";
import { resolve } from "node:path";
import { ZodError } from "zod";

import { MARKET_CONFIG } from "./data/marketConfig.js";
import { getIngredientCatalogByMarket } from "./data/ingredientCatalog.js";
import { getRecipeById } from "./data/recipes.js";
import { SETTINGS_SCHEMA, buildDefaultSettingsValues } from "./data/settingsSchema.js";
import {
  createAuthSession,
  createAuthUser,
  getAuthUserByEmail,
  getAuthUserById,
  getIdentityByProviderUid,
  getPantryItemsByUser,
  getSessionByTokenHash,
  getUserProfile,
  getUserSettings,
  listUserIdentities,
  markAuthUserLogin,
  removePantryItem,
  removeAuthSessionByTokenHash,
  setUserProfile,
  upsertIdentity,
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
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "./utils/auth.js";
import {
  authLoginSchema,
  authRegisterSchema,
  dinnerRecommendationRequestSchema,
  linkWechatIdentitySchema,
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
  const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS ?? 30);
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

  function formatAuthUser(userId: string) {
    const user = getAuthUserById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt
    };
  }

  function parseBearerToken(req: Request): string | null {
    const raw = String(req.headers.authorization ?? "");
    if (!raw.startsWith("Bearer ")) {
      return null;
    }
    return raw.slice("Bearer ".length).trim() || null;
  }

  function resolveAuthedUserId(req: Request): string | null {
    const token = parseBearerToken(req);
    if (!token) {
      return null;
    }

    const session = getSessionByTokenHash(hashToken(token));
    return session?.userId ?? null;
  }

  function resolveRequestUserId(req: Request): string | null {
    const authedUserId = resolveAuthedUserId(req);
    if (authedUserId) {
      return authedUserId;
    }

    const userId = String(req.query.userId ?? req.body?.userId ?? "");
    return userId || null;
  }

  function createSessionForUser(userId: string) {
    const plainToken = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000).toISOString();
    createAuthSession(userId, hashToken(plainToken), expiresAt);
    markAuthUserLogin(userId);
    return {
      token: plainToken,
      expiresAt
    };
  }

  function ensureProfileForUser(userId: string, market: "NZ" | "AU", timezone: string) {
    const existing = getUserProfile(userId);
    if (existing) {
      return existing;
    }

    const profile = createDefaultProfile(userId, market, timezone);
    setUserProfile(profile);
    return profile;
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/auth/register", (req, res, next) => {
    try {
      const payload = authRegisterSchema.parse(req.body);
      const normalizedEmail = payload.email.trim().toLowerCase();
      if (getAuthUserByEmail(normalizedEmail)) {
        res.status(409).json({ message: "Email already registered" });
        return;
      }

      const user = createAuthUser({
        email: normalizedEmail,
        passwordHash: hashPassword(payload.password),
        displayName: payload.displayName?.trim() || normalizedEmail.split("@")[0]
      });

      upsertIdentity({
        userId: user.id,
        provider: "email_password",
        providerUid: normalizedEmail
      });

      const market = payload.market ?? "NZ";
      const timezone = payload.timezone ?? MARKET_CONFIG[market].defaultTimezone;
      const profile = ensureProfileForUser(user.id, market, timezone);
      const session = createSessionForUser(user.id);

      res.status(201).json({
        token: session.token,
        expiresAt: session.expiresAt,
        user: formatAuthUser(user.id),
        profile
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/login", (req, res, next) => {
    try {
      const payload = authLoginSchema.parse(req.body);
      const user = getAuthUserByEmail(payload.email);
      if (!user || !verifyPassword(payload.password, user.passwordHash)) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      const session = createSessionForUser(user.id);
      const market = marketSchema.parse(req.query.market ?? "NZ");
      const timezone = String(req.query.timezone ?? MARKET_CONFIG[market].defaultTimezone);
      const profile = ensureProfileForUser(user.id, market, timezone);

      res.json({
        token: session.token,
        expiresAt: session.expiresAt,
        user: formatAuthUser(user.id),
        profile
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/auth/me", (req, res, next) => {
    try {
      const userId = resolveAuthedUserId(req);
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const market = marketSchema.parse(req.query.market ?? "NZ");
      const timezone = String(req.query.timezone ?? MARKET_CONFIG[market].defaultTimezone);
      const profile = ensureProfileForUser(userId, market, timezone);
      const user = formatAuthUser(userId);

      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      res.json({
        user,
        profile
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/logout", (req, res) => {
    const token = parseBearerToken(req);
    if (!token) {
      res.status(204).send();
      return;
    }

    removeAuthSessionByTokenHash(hashToken(token));
    res.status(204).send();
  });

  app.get("/auth/identities", (req, res) => {
    const userId = resolveAuthedUserId(req);
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    res.json({
      identities: listUserIdentities(userId)
    });
  });

  app.post("/auth/link/wechat-miniprogram", (req, res, next) => {
    try {
      const userId = resolveAuthedUserId(req);
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const payload = linkWechatIdentitySchema.parse(req.body);
      const providerUid =
        payload.providerUid ??
        payload.unionId ??
        (payload.openId && payload.appId ? `${payload.appId}:${payload.openId}` : null);

      if (!providerUid) {
        res.status(400).json({ message: "Invalid provider uid" });
        return;
      }

      const existing = getIdentityByProviderUid("wechat_miniprogram", providerUid);
      if (existing && existing.userId !== userId) {
        res.status(409).json({ message: "WeChat identity already linked to another account" });
        return;
      }

      const identity = upsertIdentity({
        userId,
        provider: "wechat_miniprogram",
        providerUid,
        unionId: payload.unionId,
        openId: payload.openId,
        appId: payload.appId
      });

      res.status(201).json(identity);
    } catch (error) {
      next(error);
    }
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
      const userId = resolveRequestUserId(req);
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const payload = pantryItemInputSchema.parse({
        ...req.body,
        userId
      });
      const created = createPantryItem(payload, market);
      res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  });

  app.get("/pantry/items", (req, res) => {
    const userId = resolveRequestUserId(req);
    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    res.json(getPantryItemsByUser(userId));
  });

  app.patch("/pantry/items/:id", (req, res, next) => {
    try {
      const userId = resolveRequestUserId(req);
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
    const userId = resolveRequestUserId(req);
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
      const userId = resolveRequestUserId(req);
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
      const userId = resolveRequestUserId(req);
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const payload = userProfileUpdateSchema.parse({
        ...req.body,
        userId
      });
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
    const userId = resolveRequestUserId(req);
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
      const userId = resolveRequestUserId(req);
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const payload = userSettingsUpsertSchema.parse({
        ...req.body,
        userId
      });
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
      const userId = resolveRequestUserId(req);
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const request = dinnerRecommendationRequestSchema.parse({
        ...req.body,
        userId
      });

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
      const userId = resolveRequestUserId(req);
      if (!userId) {
        res.status(400).json({ message: "userId is required" });
        return;
      }

      const request = shoppingListRequestSchema.parse({
        ...req.body,
        userId
      });
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
      const userId = resolveRequestUserId(req);
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
