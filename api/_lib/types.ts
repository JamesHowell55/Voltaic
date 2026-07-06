// Minimal local shims for the Vercel Node serverless function request/response
// shape, so we don't need to pull in the full @vercel/node package (which drags
// in a heavy, currently-vulnerable build-tooling dependency chain) just for two
// small type definitions.
import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[]>;
}

export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
}
