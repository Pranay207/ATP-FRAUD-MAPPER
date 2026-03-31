const STORE_KEY = "atp-fraud-mapper:shared-state";

function getKvConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

async function runKvCommand(command) {
  const kvConfig = getKvConfig();
  if (!kvConfig) {
    return null;
  }

  const response = await fetch(kvConfig.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${kvConfig.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`KV request failed: ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return payload?.result ?? null;
}

export async function readSharedState() {
  const kvConfig = getKvConfig();

  if (!kvConfig) {
    return globalThis.__ATP_SHARED_STATE__ || null;
  }

  const serializedState = await runKvCommand(["GET", STORE_KEY]);
  if (!serializedState) {
    return null;
  }

  try {
    return JSON.parse(serializedState);
  } catch (error) {
    console.warn("Could not parse persisted KV state:", error);
    return null;
  }
}

export async function writeSharedState(nextState) {
  const normalizedState = {
    ...nextState,
    persistedAt: nextState?.persistedAt || new Date().toISOString(),
  };
  const kvConfig = getKvConfig();

  if (!kvConfig) {
    globalThis.__ATP_SHARED_STATE__ = normalizedState;
    return normalizedState;
  }

  await runKvCommand(["SET", STORE_KEY, JSON.stringify(normalizedState)]);
  return normalizedState;
}
