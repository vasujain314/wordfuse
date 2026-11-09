// The BroadcastChannel test transport is web-only; phones always use Supabase.
export const isLocalAvailable = () => false;
export const connectLocal = null;
