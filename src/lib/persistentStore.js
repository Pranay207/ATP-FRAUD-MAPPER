const LOCAL_STORAGE_KEY = "atp_shared_investigation_state_v1";
const API_ENDPOINT = "/api/state";
const REQUEST_TIMEOUT_MS = 4000;

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readLocalSnapshot() {
  if (!hasBrowserStorage()) {
    return null;
  }

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Could not read persisted local state:", error);
    return null;
  }
}

function writeLocalSnapshot(snapshot) {
  if (!hasBrowserStorage()) {
    return;
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Could not write persisted local state:", error);
  }
}

function getSnapshotTimestamp(snapshot) {
  const timestamp = Date.parse(snapshot?.persistedAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function pickMostRecentSnapshot(localSnapshot, remoteSnapshot) {
  if (!localSnapshot) {
    return remoteSnapshot;
  }

  if (!remoteSnapshot) {
    return localSnapshot;
  }

  return getSnapshotTimestamp(remoteSnapshot) >= getSnapshotTimestamp(localSnapshot)
    ? remoteSnapshot
    : localSnapshot;
}

async function requestPersistedState(path, options = {}) {
  if (typeof fetch !== "function") {
    return null;
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    : null;

  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller?.signal,
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.warn("Could not reach shared state API:", error);
    }
    return null;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    ...snapshot,
    persistedAt: snapshot.persistedAt || new Date().toISOString(),
  };
}

export async function getPersistedSnapshot() {
  const localSnapshot = readLocalSnapshot();
  const remoteResponse = await requestPersistedState(API_ENDPOINT, {
    method: "GET",
  });
  const remoteSnapshot = normalizeSnapshot(remoteResponse?.state);
  const preferredSnapshot = pickMostRecentSnapshot(localSnapshot, remoteSnapshot);

  if (preferredSnapshot) {
    writeLocalSnapshot(preferredSnapshot);
  }

  return preferredSnapshot;
}

export async function savePersistedSnapshot(snapshot) {
  const normalizedSnapshot = normalizeSnapshot({
    ...snapshot,
    persistedAt: new Date().toISOString(),
  });

  if (!normalizedSnapshot) {
    return null;
  }

  writeLocalSnapshot(normalizedSnapshot);

  await requestPersistedState(API_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ state: normalizedSnapshot }),
  });

  return normalizedSnapshot;
}
