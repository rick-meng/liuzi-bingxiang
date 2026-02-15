import { DateTime } from "luxon";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { resetStore } from "../src/data/store.js";

const app = createApp();

function makeExpiry(daysFromNow: number, timezone: string): string {
  return DateTime.now()
    .setZone(timezone)
    .plus({ days: daysFromNow })
    .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
    .toISO() as string;
}

async function addPantryItem(market: "NZ" | "AU", payload: Record<string, unknown>) {
  return request(app).post(`/pantry/items?market=${market}`).send(payload);
}

describe("NZ/AU pantry MVP APIs", () => {
  beforeEach(() => {
    resetStore();
  });

  it("supports NZ recommendation and shopping list with correct currency/unit behavior", async () => {
    const userId = "u_nz_1";

    const eggResp = await addPantryItem("NZ", {
      userId,
      name: "鸡蛋",
      quantity: 6,
      unit: "piece",
      storageType: "fridge"
    });
    expect(eggResp.status).toBe(201);
    expect(eggResp.body.currency).toBe("NZD");

    await addPantryItem("NZ", {
      userId,
      name: "番茄",
      quantity: 4,
      unit: "piece",
      storageType: "fridge"
    });

    await addPantryItem("NZ", {
      userId,
      name: "米",
      quantity: 500,
      unit: "g",
      storageType: "pantry"
    });

    await addPantryItem("NZ", {
      userId,
      name: "酱油",
      quantity: 150,
      unit: "ml",
      storageType: "pantry"
    });

    const pantryResp = await request(app).get(`/pantry/items?userId=${userId}`);
    expect(pantryResp.status).toBe(200);
    expect(pantryResp.body.length).toBe(4);

    const recResp = await request(app).post("/recommendations/dinner").send({
      userId,
      market: "NZ",
      timezone: "Pacific/Auckland",
      userProfile: {
        id: userId,
        primaryMarket: "NZ",
        timezone: "Pacific/Auckland",
        currency: "NZD",
        dietPrefs: ["quick"],
        maxCookMinutes: 20
      }
    });

    expect(recResp.status).toBe(200);
    const allRecipeIds = [
      ...recResp.body.full,
      ...recResp.body.partial,
      ...recResp.body.expiryFirst
    ].map((item: { recipeId: string }) => item.recipeId);

    expect(allRecipeIds).toContain("r_egg_tomato");

    const shoppingResp = await request(app)
      .post("/shopping-list/from-recipes")
      .send({
        userId,
        market: "NZ",
        recipeIds: ["r_mapo_tofu"]
      });

    expect(shoppingResp.status).toBe(200);
    const doubanjiang = shoppingResp.body.items.find(
      (item: { ingredientKey: string }) => item.ingredientKey === "doubanjiang"
    );

    expect(doubanjiang).toBeDefined();
    expect(doubanjiang.suggestedPackage).toBe("300g jar");
    expect(doubanjiang.storeType).toBe("asian");
  });

  it("returns AU-specific substitutions and packaging suggestions", async () => {
    const recipeResp = await request(app).get("/recipes/r_kungpao_chicken?market=AU");
    expect(recipeResp.status).toBe(200);
    expect(
      recipeResp.body.aiAssist.substitutionHints.some((line: string) =>
        line.includes("dry sherry")
      )
    ).toBe(true);

    const auPantryResp = await addPantryItem("AU", {
      userId: "u_au_1",
      name: "鸡蛋",
      quantity: 6,
      unit: "piece",
      storageType: "fridge"
    });

    expect(auPantryResp.body.currency).toBe("AUD");

    const shoppingResp = await request(app)
      .post("/shopping-list/from-recipes")
      .send({
        userId: "u_au_1",
        market: "AU",
        recipeIds: ["r_mapo_tofu"]
      });

    const doubanjiang = shoppingResp.body.items.find(
      (item: { ingredientKey: string }) => item.ingredientKey === "doubanjiang"
    );

    expect(doubanjiang.suggestedPackage).toBe("368g jar");
  });

  it("prioritizes expiry-first recipes when coverage is similar", async () => {
    const userId = "u_expiry_1";
    const timezone = "Pacific/Auckland";

    await addPantryItem("NZ", {
      userId,
      name: "鸡蛋",
      quantity: 6,
      unit: "piece",
      storageType: "fridge",
      expiresAt: makeExpiry(1, timezone)
    });

    await addPantryItem("NZ", {
      userId,
      name: "番茄",
      quantity: 2,
      unit: "piece",
      storageType: "fridge"
    });

    await addPantryItem("NZ", {
      userId,
      name: "上海青",
      quantity: 400,
      unit: "g",
      storageType: "fridge"
    });

    await addPantryItem("NZ", {
      userId,
      name: "大蒜",
      quantity: 6,
      unit: "piece",
      storageType: "pantry"
    });

    const recResp = await request(app).post("/recommendations/dinner").send({
      userId,
      market: "NZ",
      timezone,
      userProfile: {
        id: userId,
        primaryMarket: "NZ",
        timezone,
        currency: "NZD",
        dietPrefs: [],
        maxCookMinutes: 30
      }
    });

    expect(recResp.status).toBe(200);

    const expiryRecipe = recResp.body.expiryFirst.find(
      (item: { recipeId: string }) => item.recipeId === "r_egg_tomato"
    );
    const fullRecipe = recResp.body.full.find(
      (item: { recipeId: string }) => item.recipeId === "r_bokchoy_garlic"
    );

    expect(expiryRecipe).toBeDefined();
    expect(fullRecipe).toBeDefined();
    expect(expiryRecipe.totalScore).toBeGreaterThan(fullRecipe.totalScore);
  });

  it("filters out recipes that exceed max cook minutes", async () => {
    const userId = "u_time_1";

    await addPantryItem("NZ", {
      userId,
      name: "牛肉片",
      quantity: 350,
      unit: "g",
      storageType: "fridge"
    });

    await addPantryItem("NZ", {
      userId,
      name: "土豆",
      quantity: 3,
      unit: "piece",
      storageType: "pantry"
    });

    await addPantryItem("NZ", {
      userId,
      name: "酱油",
      quantity: 200,
      unit: "ml",
      storageType: "pantry"
    });

    await addPantryItem("NZ", {
      userId,
      name: "姜",
      quantity: 30,
      unit: "g",
      storageType: "fridge"
    });

    const recResp = await request(app).post("/recommendations/dinner").send({
      userId,
      market: "NZ",
      timezone: "Pacific/Auckland",
      userProfile: {
        id: userId,
        primaryMarket: "NZ",
        timezone: "Pacific/Auckland",
        currency: "NZD",
        dietPrefs: [],
        maxCookMinutes: 20
      }
    });

    const allResults = [...recResp.body.full, ...recResp.body.partial, ...recResp.body.expiryFirst];

    expect(allResults.some((item: { recipeId: string }) => item.recipeId === "r_potato_beef")).toBe(
      false
    );
    expect(
      allResults.every((item: { recipe: { cookMinutes: number } }) => item.recipe.cookMinutes <= 20)
    ).toBe(true);
  });

  it("triggers expiry alerts by local timezone rules for NZ and AU", async () => {
    const nzUserId = "u_alert_nz";
    const auUserId = "u_alert_au";

    await addPantryItem("NZ", {
      userId: nzUserId,
      name: "鸡蛋",
      quantity: 4,
      unit: "piece",
      storageType: "fridge",
      expiresAt: makeExpiry(3, "Pacific/Auckland")
    });

    await addPantryItem("AU", {
      userId: auUserId,
      name: "鸡蛋",
      quantity: 4,
      unit: "piece",
      storageType: "fridge",
      expiresAt: makeExpiry(0, "Australia/Sydney")
    });

    const nzAlert = await request(app).get(
      "/alerts/expiry?userId=u_alert_nz&market=NZ&timezone=Pacific/Auckland"
    );
    const auAlert = await request(app).get(
      "/alerts/expiry?userId=u_alert_au&market=AU&timezone=Australia/Sydney"
    );

    expect(nzAlert.status).toBe(200);
    expect(auAlert.status).toBe(200);
    expect(nzAlert.body.alerts[0].stage).toBe("three_day");
    expect(auAlert.body.alerts[0].stage).toBe("today");
  });

  it("supports pantry item patch/delete for fridge drawer quick actions", async () => {
    const userId = "u_drawer_1";
    const created = await addPantryItem("NZ", {
      userId,
      name: "豆腐",
      quantity: 1,
      unit: "pack",
      storageType: "fridge"
    });

    expect(created.status).toBe(201);
    const itemId = created.body.id as string;

    const expiresAt = makeExpiry(2, "Pacific/Auckland");
    const patchResp = await request(app)
      .patch(`/pantry/items/${itemId}?userId=${userId}`)
      .send({
        quantity: 2,
        expiresAt
      });

    expect(patchResp.status).toBe(200);
    expect(patchResp.body.quantity).toBe(2);
    expect(patchResp.body.expiresAt).toBe(expiresAt);

    const deleteResp = await request(app).delete(`/pantry/items/${itemId}?userId=${userId}`);
    expect(deleteResp.status).toBe(204);

    const pantryResp = await request(app).get(`/pantry/items?userId=${userId}`);
    expect(pantryResp.body).toEqual([]);
  });

  it("supports fixed profile update and dynamic settings persistence", async () => {
    const userId = "u_settings_1";

    const profileResp = await request(app).get(`/users/me/profile?userId=${userId}&market=AU`);
    expect(profileResp.status).toBe(200);
    expect(profileResp.body.primaryMarket).toBe("AU");
    expect(profileResp.body.currency).toBe("AUD");
    expect(profileResp.body.language).toBe("zh-CN");

    const updateProfileResp = await request(app).put("/users/me/profile?market=NZ").send({
      userId,
      primaryMarket: "NZ",
      timezone: "Pacific/Auckland",
      language: "en-NZ",
      maxCookMinutes: 20
    });

    expect(updateProfileResp.status).toBe(200);
    expect(updateProfileResp.body.primaryMarket).toBe("NZ");
    expect(updateProfileResp.body.currency).toBe("NZD");
    expect(updateProfileResp.body.language).toBe("en-NZ");
    expect(updateProfileResp.body.maxCookMinutes).toBe(20);

    const schemaResp = await request(app).get("/settings/schema");
    expect(schemaResp.status).toBe(200);
    expect(Array.isArray(schemaResp.body.fields)).toBe(true);
    expect(schemaResp.body.fields.some((field: { key: string }) => field.key === "spiceLevel")).toBe(
      true
    );

    const initialSettingsResp = await request(app).get(`/users/me/settings?userId=${userId}`);
    expect(initialSettingsResp.status).toBe(200);
    expect(initialSettingsResp.body.values.expiryNotificationsEnabled).toBe(true);

    const putSettingsResp = await request(app).put("/users/me/settings").send({
      userId,
      values: {
        spiceLevel: "hot",
        expiryNotificationsEnabled: false,
        reminderTime: "19:30"
      }
    });
    expect(putSettingsResp.status).toBe(200);
    expect(putSettingsResp.body.values.spiceLevel).toBe("hot");
    expect(putSettingsResp.body.values.expiryNotificationsEnabled).toBe(false);

    const badSettingsResp = await request(app).put("/users/me/settings").send({
      userId,
      values: {
        randomUnknownKey: "x"
      }
    });
    expect(badSettingsResp.status).toBe(400);
  });

  it("exposes initialized catalog and build report", async () => {
    const catalogResp = await request(app).get("/catalog/ingredients?market=NZ");
    const reportResp = await request(app).get("/catalog/build-report");

    expect(catalogResp.status).toBe(200);
    expect(catalogResp.body.market).toBe("NZ");
    expect(catalogResp.body.count).toBeGreaterThan(0);
    expect(Array.isArray(catalogResp.body.items)).toBe(true);

    expect(reportResp.status).toBe(200);
    expect(reportResp.body.ingredientCount).toBeGreaterThan(0);
    expect(reportResp.body.recipeCount).toBeGreaterThan(0);
  });
});
