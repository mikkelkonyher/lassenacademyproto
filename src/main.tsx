/**
 * Application entry point.
 * Mounts the React tree into the DOM with all global providers:
 * BrowserRouter (client-side routing), LanguageProvider (i18n),
 * and AuthProvider (Supabase authentication state).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { WatchlistProvider } from './context/WatchlistContext';
import { WatchProgressProvider } from './context/WatchProgressContext';
import { Analytics } from '@vercel/analytics/react';

// Initialize Sentry as early as possible so errors thrown during startup are captured.
// DSN comes from VITE_SENTRY_DSN (see .env) to keep it out of source per project convention.
// If the DSN is unset (e.g. local dev without config), the SDK no-ops gracefully.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  enableLogs: true,      // enable structured logs via Sentry.logger.*
  sendDefaultPii: false, // don't auto-attach user IP / request bodies
});

// Provider order matters: BrowserRouter must wrap everything that uses routing,
// LanguageProvider supplies translations, AuthProvider depends on Supabase client,
// WatchlistProvider depends on AuthProvider for the current user.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <WatchlistProvider>
            <WatchProgressProvider>
              {/* Sentry ErrorBoundary reports render-time errors and shows a fallback
                  instead of a blank white screen. */}
              <Sentry.ErrorBoundary fallback={<p>Noget gik galt. Prøv at genindlæse siden.</p>}>
                <App />
              </Sentry.ErrorBoundary>
              <Analytics />
            </WatchProgressProvider>
          </WatchlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
