import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type {
  AuthSession,
  AuthUser,
  PantryItem,
  SettingsValues,
  UserIdentity,
  UserProfile
} from "../types/domain.js";
import type { PantryItemUpdateInput } from "../types/schemas.js";
import { createId } from "../utils/id.js";

interface PersistedStore {
  version: 1;
  pantryItems: PantryItem[];
  userProfiles: Record<string, UserProfile>;
  userSettings: Record<string, SettingsValues>;
  users: AuthUser[];
  sessions: AuthSession[];
  identities: UserIdentity[];
}

function resolveStoreFilePath(): string {
  const storeFileEnv = process.env.STORE_FILE?.trim();
  if (storeFileEnv) {
    return resolve(process.cwd(), storeFileEnv);
  }

  const renderPersistentDisk = "/var/data";
  if (existsSync(renderPersistentDisk)) {
    return resolve(renderPersistentDisk, "liuzi-bingxiang-store.json");
  }

  return resolve(process.cwd(), "data/runtime/store.json");
}

const STORE_FILE = resolveStoreFilePath();

function defaultStore(): PersistedStore {
  return {
    version: 1,
    pantryItems: [],
    userProfiles: {},
    userSettings: {},
    users: [],
    sessions: [],
    identities: []
  };
}

function loadStore(): PersistedStore {
  if (!existsSync(STORE_FILE)) {
    return defaultStore();
  }

  try {
    const raw = readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedStore>;
    return {
      version: 1,
      pantryItems: Array.isArray(parsed.pantryItems) ? parsed.pantryItems : [],
      userProfiles: parsed.userProfiles ?? {},
      userSettings: parsed.userSettings ?? {},
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      identities: Array.isArray(parsed.identities) ? parsed.identities : []
    };
  } catch {
    return defaultStore();
  }
}

let store = loadStore();

function saveStore(): void {
  mkdirSync(dirname(STORE_FILE), { recursive: true });
  writeFileSync(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

function pruneExpiredSessions(referenceTimeIso = nowIso()): void {
  const nextSessions = store.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > new Date(referenceTimeIso).getTime()
  );
  if (nextSessions.length === store.sessions.length) {
    return;
  }
  store.sessions = nextSessions;
  saveStore();
}

export function getPantryItemsByUser(userId: string): PantryItem[] {
  return store.pantryItems.filter((item) => item.userId === userId);
}

export function addPantryItem(item: PantryItem): PantryItem {
  store.pantryItems.push(item);
  saveStore();
  return item;
}

export function updatePantryItem(
  userId: string,
  itemId: string,
  patch: PantryItemUpdateInput
): PantryItem | undefined {
  const target = store.pantryItems.find((item) => item.id === itemId && item.userId === userId);
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
  saveStore();
  return target;
}

export function removePantryItem(userId: string, itemId: string): boolean {
  const index = store.pantryItems.findIndex((item) => item.id === itemId && item.userId === userId);
  if (index < 0) {
    return false;
  }

  store.pantryItems.splice(index, 1);
  saveStore();
  return true;
}

export function setUserProfile(profile: UserProfile): void {
  store.userProfiles[profile.id] = profile;
  saveStore();
}

export function getUserProfile(userId: string): UserProfile | undefined {
  return store.userProfiles[userId];
}

export function getUserSettings(userId: string): SettingsValues {
  return store.userSettings[userId] ?? {};
}

export function upsertUserSettings(userId: string, values: SettingsValues): SettingsValues {
  const existing = store.userSettings[userId] ?? {};
  const merged = {
    ...existing,
    ...values
  };
  store.userSettings[userId] = merged;
  saveStore();
  return merged;
}

export function getAuthUserByEmail(email: string): AuthUser | undefined {
  const normalized = email.trim().toLowerCase();
  return store.users.find((item) => item.email.toLowerCase() === normalized);
}

export function getAuthUserById(userId: string): AuthUser | undefined {
  return store.users.find((item) => item.id === userId);
}

export function createAuthUser(params: {
  email: string;
  passwordHash: string;
  displayName: string;
}): AuthUser {
  const current = nowIso();
  const user: AuthUser = {
    id: createId("user"),
    email: params.email.trim().toLowerCase(),
    passwordHash: params.passwordHash,
    displayName: params.displayName.trim(),
    createdAt: current,
    updatedAt: current
  };

  store.users.push(user);
  saveStore();
  return user;
}

export function markAuthUserLogin(userId: string, atIso = nowIso()): void {
  const user = store.users.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  user.lastLoginAt = atIso;
  user.updatedAt = atIso;
  saveStore();
}

export function createAuthSession(userId: string, tokenHash: string, expiresAt: string): AuthSession {
  pruneExpiredSessions();

  const session: AuthSession = {
    id: createId("session"),
    userId,
    tokenHash,
    createdAt: nowIso(),
    expiresAt
  };
  store.sessions.push(session);
  saveStore();
  return session;
}

export function getSessionByTokenHash(tokenHash: string): AuthSession | undefined {
  pruneExpiredSessions();
  return store.sessions.find((session) => session.tokenHash === tokenHash);
}

export function removeAuthSessionByTokenHash(tokenHash: string): boolean {
  const index = store.sessions.findIndex((session) => session.tokenHash === tokenHash);
  if (index < 0) {
    return false;
  }

  store.sessions.splice(index, 1);
  saveStore();
  return true;
}

export function removeAuthSessionsByUserId(userId: string): number {
  const before = store.sessions.length;
  store.sessions = store.sessions.filter((session) => session.userId !== userId);
  const removed = before - store.sessions.length;
  if (removed > 0) {
    saveStore();
  }
  return removed;
}

export function getIdentityByProviderUid(
  provider: UserIdentity["provider"],
  providerUid: string
): UserIdentity | undefined {
  return store.identities.find(
    (identity) => identity.provider === provider && identity.providerUid === providerUid
  );
}

export function upsertIdentity(identityInput: {
  userId: string;
  provider: UserIdentity["provider"];
  providerUid: string;
  unionId?: string;
  openId?: string;
  appId?: string;
}): UserIdentity {
  const now = nowIso();
  const existing = store.identities.find(
    (identity) =>
      identity.provider === identityInput.provider && identity.providerUid === identityInput.providerUid
  );

  if (existing) {
    existing.userId = identityInput.userId;
    existing.unionId = identityInput.unionId;
    existing.openId = identityInput.openId;
    existing.appId = identityInput.appId;
    existing.updatedAt = now;
    saveStore();
    return existing;
  }

  const created: UserIdentity = {
    id: createId("identity"),
    userId: identityInput.userId,
    provider: identityInput.provider,
    providerUid: identityInput.providerUid,
    unionId: identityInput.unionId,
    openId: identityInput.openId,
    appId: identityInput.appId,
    createdAt: now,
    updatedAt: now
  };
  store.identities.push(created);
  saveStore();
  return created;
}

export function listUserIdentities(userId: string): UserIdentity[] {
  return store.identities.filter((identity) => identity.userId === userId);
}

export function resetStore(): void {
  store = defaultStore();
  saveStore();
}
