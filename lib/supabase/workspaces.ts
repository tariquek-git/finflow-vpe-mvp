import { getSupabaseClient, type CloudWorkspaceRecord } from './client';

export type CloudWorkspaceUpsertPayload = {
  id: string;
  owner_id: string;
  name: string;
  graph: Record<string, unknown>;
  layout: Record<string, unknown>;
};

export const fetchWorkspaceById = async (workspaceId: string) => {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as CloudWorkspaceRecord | null;
};

export const upsertWorkspace = async (payload: CloudWorkspaceUpsertPayload) => {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from('workspaces')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as CloudWorkspaceRecord;
};

export const insertWorkspaceVersion = async (
  workspaceId: string,
  ownerId: string,
  snapshot: Record<string, unknown>
) => {
  const client = getSupabaseClient();
  if (!client) return null;

  const { error } = await client.from('workspace_versions').insert({
    workspace_id: workspaceId,
    owner_id: ownerId,
    snapshot
  });

  if (error) {
    throw error;
  }

  return true;
};
