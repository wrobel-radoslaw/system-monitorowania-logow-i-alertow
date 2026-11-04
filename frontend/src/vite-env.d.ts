/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API. Empty in development, where Vite proxies /api. */
  readonly VITE_API_URL?: string;
  /** "true" serves the API from mock data in the browser (dev server only). */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
