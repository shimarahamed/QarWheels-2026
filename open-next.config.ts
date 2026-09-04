import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Minimal config: no incremental-cache/queue/tag-cache overrides. Those
// default to in-memory/no-op implementations under OpenNext, which is fine
// for this app — pages here are either dynamic (auth-gated dashboards) or
// rely on Firestore directly for data, not on Next's ISR cache layer.
export default defineCloudflareConfig();
