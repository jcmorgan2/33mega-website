// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://33mega.cloud',
  integrations: [
    sitemap({
      // Keep error / utility pages out of the index.
      filter: (page) => !/\/(404|contact\/thanks)\/?$/.test(page),
    }),
  ],
});
