/**
 * Configuration unifiée de l'URL API Backend pour le Frontend Client.
 * Assure la compatibilité totale en local et en production :
 * - Si VITE_BACKEND_URL est vide -> fallback 'http://localhost:3001/api'
 * - Si VITE_BACKEND_URL est 'https://vork-backend1.herokuapp.com' -> normalise en 'https://vork-backend1.herokuapp.com/api'
 * - Si VITE_BACKEND_URL est 'https://vork-backend1.herokuapp.com/api' -> conserve 'https://vork-backend1.herokuapp.com/api'
 * - Si VITE_BACKEND_URL est '/api' (proxy relatif Nginx) -> conserve '/api'
 */
function resolveBackendUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL as string;
  if (!envUrl || !envUrl.trim()) {
    return 'http://localhost:3001/api';
  }
  const clean = envUrl.trim().replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

export const API_BASE = resolveBackendUrl();
