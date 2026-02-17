import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type CloudWorkspaceRecord = {
  id: string;
  owner_id: string;
  name: string;
  graph: Json;
  layout: Json;
  created_at: string;
  updated_at: string;
};

let cachedClient: SupabaseClient | null = null;

const readEnv = (key: string) => {
  const value = (import.meta.env[key] as string | undefined) || '';
  return value.trim();
};

export const isCloudSyncEnabled = () => import.meta.env.VITE_ENABLE_CLOUD_SYNC === 'true';

export const getSupabaseConfig = () => {
  const url = readEnv('VITE_SUPABASE_URL');
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');
  return { url, anonKey };
};

export const isSupabaseConfigured = () => {
  if (!isCloudSyncEnabled()) return false;
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
};

export const getSupabaseClient = () => {
  if (!isSupabaseConfigured()) return null;
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return cachedClient;
};
