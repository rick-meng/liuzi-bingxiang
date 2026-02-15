import type { PantryItem, SettingsValues, UserProfile } from "../types/domain.js";
import type { PantryItemUpdateInput } from "../types/schemas.js";

const pantryItems: PantryItem[] = [];
const userProfiles = new Map<string, UserProfile>();
const userSettings = new Map<string, SettingsValues>();

export function getPantryItemsByUser(userId: string): PantryItem[] {
  return pantryItems.filter((item) => item.userId === userId);
}

export function addPantryItem(item: PantryItem): PantryItem {
  pantryItems.push(item);
  return item;
}

export function updatePantryItem(
  userId: string,
  itemId: string,
  patch: PantryItemUpdateInput
): PantryItem | undefined {
  const target = pantryItems.find((item) => item.id === itemId && item.userId === userId);
  if (!target) {
    return undefined;
  }

  const normalizedPatch: Partial<PantryItem> = {
    ...patch,
    openedAt: patch.openedAt ?? undefined,
    expiresAt: patch.expiresAt ?? undefined,
    purchasedAt: patch.purchasedAt ?? undefined
  };

  Object.assign(target, normalizedPatch);
  return target;
}

export function removePantryItem(userId: string, itemId: string): boolean {
  const index = pantryItems.findIndex((item) => item.id === itemId && item.userId === userId);
  if (index < 0) {
    return false;
  }

  pantryItems.splice(index, 1);
  return true;
}

export function setUserProfile(profile: UserProfile): void {
  userProfiles.set(profile.id, profile);
}

export function getUserProfile(userId: string): UserProfile | undefined {
  return userProfiles.get(userId);
}

export function getUserSettings(userId: string): SettingsValues {
  return userSettings.get(userId) ?? {};
}

export function upsertUserSettings(userId: string, values: SettingsValues): SettingsValues {
  const existing = userSettings.get(userId) ?? {};
  const merged = {
    ...existing,
    ...values
  };
  userSettings.set(userId, merged);
  return merged;
}

export function resetStore(): void {
  pantryItems.splice(0, pantryItems.length);
  userProfiles.clear();
  userSettings.clear();
}
