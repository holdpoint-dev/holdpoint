import type { EventV1, LiveCapabilities } from "@holdpoint/live-protocol";

export interface TranslateHookInputOptions {
  cwd?: string;
}

export interface LiveAdapter {
  id: string;
  displayName: string;
  capabilities: LiveCapabilities;
  generateBridgeCommand(): string;
  translateHookInput(raw: unknown, options?: TranslateHookInputOptions): EventV1 | null;
}

export interface HoldpointEngineManifest {
  manifestVersion: 1;
  id: string;
  displayName: string;
}
