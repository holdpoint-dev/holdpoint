import type { LiveCapabilities } from "@holdpoint/live-protocol";

export interface GenerateBridgeCommandArgs {
  event: string;
}

export interface LiveAdapter {
  id: string;
  displayName: string;
  capabilities: LiveCapabilities;
  generateBridgeCommand(args: GenerateBridgeCommandArgs): string;
}
