/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly API_BASE_URL?: string;
  readonly VITE_API_URL?: string;
  readonly API_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly BACKEND_URL?: string;
  readonly VITE_API_ENDPOINT?: string;
  readonly API_ENDPOINT?: string;
  readonly APIKEY?: string;
  readonly API_KEY?: string;
  readonly VITE_APIKEY?: string;
  readonly VITE_API_KEY?: string;
  readonly AZURE_API_KEY?: string;
  readonly VITE_AZURE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
