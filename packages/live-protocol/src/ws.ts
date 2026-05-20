import { z } from "zod";
import { ControlCommandSchema, EventV1Schema, EventsBatchSchema } from "./event.js";

export const ClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("subscribe"),
    scope: z.enum(["project", "session", "all"]),
    key: z.string().optional(),
    since_seq: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("register_control"),
    session_key: z.string().min(1),
  }),
  z.object({
    type: z.literal("unsubscribe"),
    key: z.string().min(1),
  }),
  z.object({
    type: z.literal("publish_event"),
    event: EventV1Schema,
  }),
  z.object({
    type: z.literal("ping"),
  }),
]);

export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("event"),
    event: EventV1Schema,
  }),
  z.object({
    type: z.literal("events_batch"),
    events: EventsBatchSchema,
  }),
  z.object({
    type: z.literal("control"),
    session_key: z.string().min(1),
    command: ControlCommandSchema,
  }),
  z.object({
    type: z.literal("ack"),
    for: z.string().min(1),
  }),
  z.object({
    type: z.literal("error"),
    code: z.string().min(1),
    message: z.string().min(1),
  }),
  z.object({
    type: z.literal("pong"),
  }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
