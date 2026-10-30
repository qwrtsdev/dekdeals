// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Noto Sans Thai",
      cssVariable: "--font-noto-sans-thai",
      weights: [400, 500, 600, 700, 900],
      subsets: ["thai", "latin"],
      styles: ["normal"],
    }
  ],

  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [react()]
});