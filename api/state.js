import { readSharedState, writeSharedState } from "./_lib/stateStore.js";

async function readJsonBody(req) {
  if (!req) {
    return {};
  }

  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }

  return new Promise((resolve, reject) => {
    let rawBody = "";

    req.on("data", (chunk) => {
      rawBody += chunk;
    });

    req.on("end", () => {
      try {
        resolve(rawBody ? JSON.parse(rawBody) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const state = await readSharedState();
    return res.status(200).json({
      ok: true,
      state,
    });
  }

  if (req.method === "POST") {
    try {
      const payload = await readJsonBody(req);
      const state = payload?.state;

      if (!state || typeof state !== "object") {
        return res.status(400).json({
          ok: false,
          error: "A valid state payload is required.",
        });
      }

      const savedState = await writeSharedState(state);
      return res.status(200).json({
        ok: true,
        state: savedState,
      });
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: error?.message || "Could not parse request body.",
      });
    }
  }

  return res.status(405).json({
    ok: false,
    error: "Method not allowed.",
  });
}
