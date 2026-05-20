import { z } from "zod";
import {
  EventV1Schema,
  EventsBatchSchema,
  LiveCapabilitiesSchema,
  ProjectHashSchema,
} from "./event.js";

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  version: z.string().min(1),
  started_at: z.number().int().nonnegative(),
});

export const IngestResponseSchema = z.object({
  ok: z.literal(true),
  accepted: z.number().int().nonnegative(),
});

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string().min(1),
});

export const ProjectSummarySchema = z.object({
  project_hash: ProjectHashSchema,
  name: z.string().min(1),
  root: z.string().min(1),
  last_active: z.number().int().nonnegative(),
  session_count: z.number().int().nonnegative(),
});

export const SessionSummarySchema = z.object({
  key: z.string().min(1),
  project_hash: ProjectHashSchema,
  engine: z.string().min(1),
  session_id: z.string().min(1),
  cwd: z.string().min(1),
  last_event_at: z.number().int().nonnegative(),
  last_seq: z.number().int().positive().optional(),
  event_count: z.number().int().nonnegative(),
  caps: LiveCapabilitiesSchema.optional(),
});

export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectSummarySchema),
});

export const SessionsResponseSchema = z.object({
  sessions: z.array(SessionSummarySchema),
});

export const SessionEventsResponseSchema = z.object({
  session_key: z.string().min(1),
  since_seq: z.number().int().nonnegative(),
  max_seq: z.number().int().nonnegative(),
  events: z.array(EventV1Schema),
});

export const EventsBatchRequestSchema = EventsBatchSchema;

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type SessionSummary = z.infer<typeof SessionSummarySchema>;
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;
export type SessionsResponse = z.infer<typeof SessionsResponseSchema>;
export type SessionEventsResponse = z.infer<typeof SessionEventsResponseSchema>;
