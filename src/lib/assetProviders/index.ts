// The registry of active external asset providers. The Elements UI iterates this list rather
// than importing a provider by name, so adding a second provider later (or a future one that
// needs a backend-issued token, kept strictly optional per the browser-only architecture) means
// adding one entry here, not touching the editor.
import { openverseProvider } from "./openverse";
import type { AssetProvider } from "./types";

export const ASSET_PROVIDERS: AssetProvider[] = [openverseProvider];

export * from "./types";
