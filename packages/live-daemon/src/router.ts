import type { EventV1 } from "@holdpoint/live-protocol";
import { buildSessionKey } from "./store.js";

export interface Subscription {
  scope: "project" | "session" | "all";
  key?: string;
}

export function matchesSubscription(subscription: Subscription, event: EventV1): boolean {
  switch (subscription.scope) {
    case "all":
      return true;
    case "project":
      return subscription.key === event.project_hash;
    case "session":
      return subscription.key === buildSessionKey(event);
  }
}
