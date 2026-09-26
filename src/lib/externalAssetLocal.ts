// Convertly has no backend, so "recently used" and "favorites" for external assets are kept in
// the browser's own localStorage, per this device, rather than a server-side account feature.
import type { ExternalAsset } from "./assetProviders/types";

const RECENT_KEY = "convertly-external-assets-recent";
const FAVORITES_KEY = "convertly-external-assets-favorites";
const MAX_RECENT = 24;

function readList(key: string): ExternalAsset[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: ExternalAsset[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Best-effort only (private browsing, storage disabled, quota exceeded): losing the
    // recently-used/favorites list is never worth interrupting the person's actual editing.
  }
}

function assetKey(asset: ExternalAsset): string {
  return `${asset.providerId}:${asset.id}`;
}

export function getRecentAssets(): ExternalAsset[] {
  return readList(RECENT_KEY);
}

export function recordRecentAsset(asset: ExternalAsset): void {
  const list = readList(RECENT_KEY).filter((a) => assetKey(a) !== assetKey(asset));
  list.unshift(asset);
  writeList(RECENT_KEY, list.slice(0, MAX_RECENT));
}

export function getFavoriteAssets(): ExternalAsset[] {
  return readList(FAVORITES_KEY);
}

export function isFavoriteAsset(asset: ExternalAsset): boolean {
  return readList(FAVORITES_KEY).some((a) => assetKey(a) === assetKey(asset));
}

export function toggleFavoriteAsset(asset: ExternalAsset): boolean {
  const list = readList(FAVORITES_KEY);
  const idx = list.findIndex((a) => assetKey(a) === assetKey(asset));
  if (idx >= 0) {
    list.splice(idx, 1);
    writeList(FAVORITES_KEY, list);
    return false;
  }
  list.unshift(asset);
  writeList(FAVORITES_KEY, list);
  return true;
}
