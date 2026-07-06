import type { IncomingMessage } from 'http';

// Stripe webhook signature verification needs the exact raw request bytes —
// Vercel's default JSON body parsing (re-serialized) would break the signature
// check, so the webhook route disables it (`config.api.bodyParser = false`) and
// reads the stream itself via this helper.
export function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
