/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_OAUTH_REDIRECT_URL?: string;
  readonly VITE_SUPABASE_PASSWORD_RESET_REDIRECT_URL?: string;
  readonly VITE_REVENUECAT_APPLE_API_KEY?: string;
  readonly VITE_REVENUECAT_GOOGLE_API_KEY?: string;
  readonly VITE_REVENUECAT_ENTITLEMENT_ID?: string;
  readonly VITE_REVENUECAT_OFFERING_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
