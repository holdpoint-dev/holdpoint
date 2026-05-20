import { readFileSync } from "node:fs";
import { parseEventV1, parseEventsBatch } from "@holdpoint/live-protocol";
import { BridgeClient } from "@holdpoint/sdk";
import { loadLiveAdapter } from "../engines.js";

function readStdin(): string {
  return readFileSync(0, "utf8");
}

export async function eventCommand(options: {
  engine?: string;
  fromHook?: boolean;
}): Promise<void> {
  const stdin = readStdin().trim();
  if (!stdin) {
    if (options.fromHook) {
      process.exit(0);
    }
    console.error("No JSON input received on stdin.");
    process.exit(3);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(stdin);
  } catch {
    if (options.fromHook) {
      process.exit(0);
    }
    console.error("Invalid JSON input.");
    process.exit(3);
  }

  const client = new BridgeClient();

  try {
    if (options.fromHook) {
      if (!options.engine) {
        process.exit(0);
      }
      const adapter = await loadLiveAdapter(options.engine);
      if (!adapter) {
        process.exit(0);
      }
      const event = adapter.translateHookInput(raw, { cwd: process.cwd() });
      if (!event) {
        process.exit(0);
      }
      await client.sendEvent(event);
      process.exit(0);
    }

    if (Array.isArray(raw)) {
      await client.sendEvents(parseEventsBatch(raw));
    } else {
      await client.sendEvent(parseEventV1(raw));
    }
  } catch (error) {
    console.error((error as Error).message);
    process.exit(3);
  }
}
