const TABLE_NAME = 'pilotprocess_projects';

function cleanUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getSupabaseConfig() {
  const env = import.meta.env || {};
  const url = cleanUrl(
    env.VITE_SUPABASE_URL ||
    env.VITE_STORAGE_SUPABASE_URL ||
    env.VITE_STORAGE_URL
  );
  const anonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_STORAGE_SUPABASE_ANON_KEY ||
    env.VITE_STORAGE_ANON_KEY ||
    env.VITE_SUPABASE_KEY ||
    '';

  if (!url.startsWith('https://') || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

async function requestSupabase(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase non configure');

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Erreur Supabase ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function loadProjectsFromSupabase() {
  if (!isSupabaseConfigured()) return null;

  const rows = await requestSupabase(`${TABLE_NAME}?select=id,payload,updated_at&order=updated_at.desc`);
  return (rows || [])
    .map((row) => ({ ...(row.payload || {}), _projectId: row.id || row.payload?._projectId }))
    .filter((project) => project && project._projectId);
}

export async function saveProjectsToSupabase(projects, deletedIds = []) {
  if (!isSupabaseConfigured()) return false;

  const rows = (projects || []).map((project) => ({
    id: project._projectId,
    payload: project,
    updated_at: project.updatedAt || new Date().toISOString(),
  }));

  if (rows.length) {
    await requestSupabase(`${TABLE_NAME}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
  }

  if (deletedIds.length) {
    const ids = deletedIds.map((id) => `"${String(id).replace(/"/g, '\\"')}"`).join(',');
    await requestSupabase(`${TABLE_NAME}?id=in.(${encodeURIComponent(ids)})`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
  }

  return true;
}
