/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEON_CONFIGURED?: boolean | string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
