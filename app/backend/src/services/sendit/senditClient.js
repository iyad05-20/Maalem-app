import dotenv from "dotenv";

dotenv.config();

const SENDIT_API_URL = process.env.SENDIT_API_URL || "https://app.sendit.ma/api/v1";
const SENDIT_PUBLIC_KEY = process.env.SENDIT_PUBLIC_KEY || "";
const SENDIT_SECRET_KEY = process.env.SENDIT_SECRET_KEY || "";

let cachedToken = null;

/**
 * Get authentication token from Sendit API.
 */
export async function getAuthToken() {
  if (cachedToken) return cachedToken;

  const response = await fetch(`${SENDIT_API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      public_key: SENDIT_PUBLIC_KEY,
      secret_key: SENDIT_SECRET_KEY,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sendit authentication failed: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data?.token) {
    throw new Error("Sendit authentication response indicated failure or missing token");
  }

  cachedToken = result.data.token;
  return cachedToken;
}

/**
 * Reset authentication cache.
 */
export function clearAuthCache() {
  cachedToken = null;
}

/**
 * Helper to make authorized requests to Sendit API.
 */
async function authorizedFetch(endpoint, options = {}) {
  const token = await getAuthToken();
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${SENDIT_API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token might have expired, clear cache and retry once
    clearAuthCache();
    return authorizedFetch(endpoint, options);
  }

  if (!response.ok) {
    throw new Error(`Sendit API request to ${endpoint} failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const senditClient = {
  /**
   * Create a new delivery package in Sendit system.
   */
  async createDelivery(data) {
    return authorizedFetch("/deliveries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Request a package pickup.
   */
  async createPickup(data) {
    return authorizedFetch("/pickups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieve printable PDF labels for delivery codes.
   */
  async getLabels(codesToPrint, printFormat = 1) {
    return authorizedFetch("/deliveries/getlabels", {
      method: "POST",
      body: JSON.stringify({ codesToPrint, printFormat }),
    });
  },

  /**
   * List available delivery districts / cities.
   */
  async getDistricts(querystring) {
    const query = querystring ? `?querystring=${encodeURIComponent(querystring)}` : "";
    return authorizedFetch(`/districts${query}`, { method: "GET" });
  },

  /**
   * Create a new return request.
   */
  async createReturn(data) {
    return authorizedFetch("/returns", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
