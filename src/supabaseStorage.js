const TABLE_NAME = 'pilotprocess_projects';
const SESSION_KEY = 'pilotprocess-auth-session';

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

function getStoredSession() {
  try {
    return JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function storeSession(session) {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

async function requestAuth(path, options = {}) {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase non configure');

  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.msg || payload?.error_description || payload?.message || 'Authentification impossible');
  return payload;
}

export async function signUpWithEmail(email, password) {
  const payload = await requestAuth('signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return storeSession(payload.access_token ? payload : null);
}

export async function signInWithEmail(email, password) {
  const payload = await requestAuth('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return storeSession(payload);
}

export async function signOutFromSupabase(session) {
  const config = getSupabaseConfig();
  if (config && session?.access_token) {
    await fetch(`${config.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => null);
  }
  storeSession(null);
}

export async function getCurrentSession() {
  const session = getStoredSession();
  if (!session?.access_token) return null;
  const expiresAt = Number(session.expires_at || 0) * 1000;
  if (session.refresh_token && expiresAt && Date.now() > expiresAt - 60000) {
    try {
      const refreshed = await requestAuth('token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      return storeSession(refreshed);
    } catch {
      storeSession(null);
      return null;
    }
  }
  return session;
}

async function requestSupabase(path, options = {}, session = null) {
  const config = getSupabaseConfig();
  if (!config) throw new Error('Supabase non configure');

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session?.access_token || config.anonKey}`,
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

export async function loadProjectsFromSupabase(session) {
  if (!isSupabaseConfigured() || !session?.access_token) return null;

  const rows = await requestSupabase(`${TABLE_NAME}?select=id,payload,updated_at&order=updated_at.desc`, {}, session);
  return (rows || [])
    .map((row) => ({ ...(row.payload || {}), _projectId: row.id || row.payload?._projectId }))
    .filter((project) => project && project._projectId);
}

export async function saveProjectsToSupabase(projects, deletedIds = [], session = null) {
  if (!isSupabaseConfigured() || !session?.access_token || !session?.user?.id) return false;

  const rows = (projects || []).map((project) => ({
    id: project._projectId,
    owner_id: session.user.id,
    payload: project,
    updated_at: project.updatedAt || new Date().toISOString(),
  }));

  if (rows.length) {
    await requestSupabase(`${TABLE_NAME}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    }, session);
  }

  if (deletedIds.length) {
    const ids = deletedIds.map((id) => encodeURIComponent(String(id))).join(',');
    await requestSupabase(`${TABLE_NAME}?id=in.(${ids})`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    }, session);
  }

  return true;
}
