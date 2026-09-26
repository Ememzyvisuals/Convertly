// A provider-agnostic shape for an external, searchable visual asset. Every provider (Openverse
// today, anything else later) maps its own response into this one shape, so the Elements UI
// never needs to know or care where an asset actually came from.
export interface ExternalAsset {
  id: string;
  providerId: string;
  providerLabel: string;
  title: string;
  /** Small preview used in the search grid; keep this the only thing fetched for a whole page
   * of results, so browsing never pulls down full-resolution files. */
  thumbnailUrl: string;
  /** The real, full-resolution file, only fetched once the person actually adds the asset. */
  fullUrl: string;
  width?: number;
  height?: number;
  creator?: string;
  creatorUrl?: string;
  source?: string;
  license?: string;
  licenseVersion?: string;
  licenseUrl?: string;
  foreignLandingUrl?: string;
  tags?: string[];
}

export interface AssetSearchResult {
  items: ExternalAsset[];
  hasMore: boolean;
  nextPage: number;
}

export interface AssetProvider {
  id: string;
  label: string;
  /** Attribution/legal note shown once, near the search box, since results are pulled from a
   * live third-party catalog rather than assets Convertly itself created. */
  disclosure: string;
  search(query: string, page: number): Promise<AssetSearchResult>;
}
