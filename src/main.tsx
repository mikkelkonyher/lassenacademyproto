/**
 * Application entry point.
 * Mounts the React tree into the DOM with all global providers:
 * BrowserRouter (client-side routing), LanguageProvider (i18n),
 * and AuthProvider (Supabase authentication state).
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import { Analytics } from '@vercel/analytics/react';

// Provider order matters: BrowserRouter must wrap everything that uses routing,
// LanguageProvider supplies translations, AuthProvider depends on Supabase client.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <App />
          <Analytics />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
