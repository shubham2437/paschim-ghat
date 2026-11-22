import { defineCloudflareConfig } from '@opennextjs/cloudflare';

export default {
  ...defineCloudflareConfig(),
  // `npm run build` runs the OpenNext build (so Cloudflare's build step produces
  // .open-next/); this is the underlying Next.js build it wraps.
  buildCommand: 'next build',
};
