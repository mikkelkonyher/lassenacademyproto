import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Uploads source maps to Sentry at build time so production stack traces map back
    // to original TypeScript. Only runs when SENTRY_AUTH_TOKEN is set (build still
    // succeeds without it — it just warns and skips the upload), so local dev and CI
    // without the token are unaffected.
    sentryVitePlugin({
      org: 'lma-ad',                         // Sentry organization slug
      project: 'javascript-react',           // Sentry project slug
      authToken: process.env.SENTRY_AUTH_TOKEN, // build-time only, never in the client bundle
      // EU region is auto-detected from the org auth token (it embeds region_url).
      // Delete the .map files from dist after upload so source isn't served publicly.
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
    }),
  ],
  build: {
    // Emit source maps so Sentry can upload them, but use 'hidden' so they are NOT
    // referenced in the shipped JS — readable source is never exposed to end users.
    sourcemap: 'hidden',
  },
})
