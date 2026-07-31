/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEBIRR_PHONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
