// Openverse (openverse.org) indexes hundreds of millions of openly licensed and public-domain
// images from sources like Flickr, Wikimedia Commons, museums and stock sites, and its API is
// built for exactly this kind of client-side use, with no API key required for ordinary search
// volume. This keeps Convertly's "external assets" feature honest with the app's browser-only,
// no-backend architecture: no secret key lives in this file, and there is nothing for a backend
// to proxy.
import type { AssetProvider, AssetSearchResult, ExternalAsset } from "./types";

const API_BASE = "https://api.openverse.org/v1/images/";
const PAGE_SIZE = 20;

// A tiny in-memory cache keyed by "query:page", so paging back to a page already seen (or a
// repeated search within the same session) never re-hits the network.
const cache = new Map<string, AssetSearchResult>();

interface OpenverseResultItem {
  id: string;
  title?: string;
  url: string;
  thumbnail?: string;
  license?: string;
  license_version?: string;
  license_url?: string;
  creator?: string;
  creator_url?: string;
  source?: string;
  foreign_landing_url?: string;
  width?: number;
  height?: number;
  tags?: { name: string }[];
}

interface OpenverseResponse {
  result_count: number;
  page_count: number;
  page_size: number;
  page: number;
  results: OpenverseResultItem[];
}

function mapItem(item: OpenverseResultItem): ExternalAsset {
  return {
    id: item.id,
    providerId: "openverse",
    providerLabel: "Openverse",
    title: item.title || "Untitled",
    thumbnailUrl: item.thumbnail || item.url,
    fullUrl: item.url,
    width: item.width,
    height: item.height,
    creator: item.creator,
    creatorUrl: item.creator_url,
    source: item.source,
    license: item.license,
    licenseVersion: item.license_version,
    licenseUrl: item.license_url,
    foreignLandingUrl: item.foreign_landing_url,
    tags: (item.tags || []).map((t) => t.name).filter(Boolean),
  };
}

export const openverseProvider: AssetProvider = {
  id: "openverse",
  label: "Openverse",
  disclosure:
    "Openly licensed and public-domain images from Openverse (openverse.org), sourced from places like Flickr, Wikimedia Commons and museums. Licenses vary by asset; check the license shown before using an image commercially.",

  async search(query: string, page: number): Promise<AssetSearchResult> {
    const q = query.trim();
    if (!q) return { items: [], hasMore: false, nextPage: page };

    const cacheKey = `${q.toLowerCase()}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const url = `${API_BASE}?q=${encodeURIComponent(q)}&page=${page}&page_size=${PAGE_SIZE}`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" } });
    } catch {
      throw new Error("Could not reach the external asset library. Check your connection and try again.");
    }
    if (!res.ok) {
      if (res.status === 429) throw new Error("Too many searches at once. Wait a moment and try again.");
      throw new Error("The external asset library did not respond. Try again in a moment.");
    }
    const data = (await res.json()) as OpenverseResponse;
    const items = (data.results || []).map(mapItem);
    const result: AssetSearchResult = {
      items,
      hasMore: page < (data.page_count || 1),
      nextPage: page + 1,
    };
    cache.set(cacheKey, result);
    return result;
  },
};
