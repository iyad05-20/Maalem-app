import type { 
  AdminStats, 
  DisputeDossier, 
  VendorProfile, 
  VendorWarning, 
  WithdrawalRequest, 
  LedgerEntry, 
  CronExecution 
} from "../types/adminTypes";

const DEFAULT_MASTER_KEY = "vork_admin_master_passkey_2026";

export function getBackendUrl(): string {
  const custom = localStorage.getItem("admin_target_backend_url");
  if (custom && custom.trim()) {
    return custom.replace(/\/$/, "");
  }
  const envUrl = (import.meta as any).env?.VITE_BACKEND_URL || "http://localhost:3001/api";
  return envUrl.replace(/\/$/, "");
}

export function setBackendUrl(url: string) {
  if (!url || url.trim() === "http://localhost:3001/api") {
    localStorage.removeItem("admin_target_backend_url");
  } else {
    localStorage.setItem("admin_target_backend_url", url.trim());
  }
}

export function getMasterKey(): string {
  return localStorage.getItem("admin_master_key") || DEFAULT_MASTER_KEY;
}

export function setMasterKey(key: string) {
  localStorage.setItem("admin_master_key", key.trim());
}

/**
 * Assure la présence d'une session JWT opérateur admin valide (Auto-login transparent ou réutilisation de session)
 */
export async function ensureAdminAuth(): Promise<string> {
  const existing = localStorage.getItem("admin_jwt_token");
  if (existing) return existing;

  try {
    const root = getBackendUrl().replace(/\/admin\/?$/, "").replace(/\/api\/?$/, "");
    const res = await fetch(`${root}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@vork.ma", password: "AdminVork2026!" }),
    });
    const data = await res.json();
    if (data.success && (data.token || data.session?.access_token)) {
      const token = data.token || data.session?.access_token;
      localStorage.setItem("admin_jwt_token", token);
      return token;
    }
  } catch (err) {
    console.warn("[ADMIN-AUTH] Initialisation de session automatique:", err);
  }
  return "";
}

/**
 * En-têtes sécurisés exigés par le middleware requireAdmin
 */
export function getAdminHeaders(): Record<string, string> {
  const token = localStorage.getItem("admin_jwt_token") || "";
  const headers: Record<string, string> = {
    "X-Admin-Master-Key": getMasterKey(),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch sécurisé avec injection d'en-têtes et tentative de régénération de session
 */
async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  await ensureAdminAuth();
  let headers = {
    ...getAdminHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  let res = await fetch(url, { ...options, headers });

  // Si le token a expiré, renouveler la session et retenter une fois
  if (res.status === 401) {
    localStorage.removeItem("admin_jwt_token");
    const newToken = await ensureAdminAuth();
    if (newToken) {
      headers = {
        ...getAdminHeaders(),
        ...(options.headers as Record<string, string> || {}),
      };
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
}

const getApiBase = () => `${getBackendUrl()}/admin`;
const getCronBase = () => `${getBackendUrl()}/cron`;

export const adminAPI = {
  async getStats(): Promise<AdminStats> {
    const res = await adminFetch(`${getApiBase()}/stats`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération KPIs.");
    return data.stats;
  },

  async getDisputes(): Promise<DisputeDossier[]> {
    const res = await adminFetch(`${getApiBase()}/disputes`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération litiges.");
    return data.disputes;
  },

  async getDisputeDetail(id: string): Promise<{ dispute: DisputeDossier; order: any }> {
    const res = await adminFetch(`${getApiBase()}/disputes/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération dossier de litige.");
    return data;
  },

  async resolveDispute(
    id: string, 
    resolutionType: "refund_total" | "refund_partial" | "replacement" | "rejected", 
    arbitrationDecision: string, 
    arbitrationAmount: number = 0
  ): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`${getApiBase()}/disputes/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionType, arbitrationDecision, arbitrationAmount }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur lors de l'enregistrement de l'arbitrage.");
    return data;
  },

  async getVendors(): Promise<{ profiles: VendorProfile[]; warnings: VendorWarning[] }> {
    const res = await adminFetch(`${getApiBase()}/vendors`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération profils vendeurs.");
    return data;
  },

  async issueVendorWarning(vendorId: string, reason: string, orderId?: string): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`${getApiBase()}/vendors/${vendorId}/warning`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, orderId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur lors de l'émission de l'avertissement.");
    return data;
  },

  async updateVendorStatus(vendorId: string, suspensionStatus: string, suspendedUntil?: string): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`${getApiBase()}/vendors/${vendorId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspensionStatus, suspendedUntil }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur mise à jour statut boutique.");
    return data;
  },

  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    const res = await adminFetch(`${getApiBase()}/withdrawals`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération retraits.");
    return data.requests;
  },

  async processWithdrawal(id: string, status: "processed" | "rejected"): Promise<{ success: boolean; message: string }> {
    const res = await adminFetch(`${getApiBase()}/withdrawals/${id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur traitement virement.");
    return data;
  },

  async getLedger(): Promise<LedgerEntry[]> {
    const res = await adminFetch(`${getApiBase()}/ledger`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération Grand Livre.");
    return data.entries;
  },

  async getLogistics(): Promise<any[]> {
    const res = await adminFetch(`${getApiBase()}/logistics`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération expéditions.");
    return data.orders;
  },

  async getCronStatus(): Promise<CronExecution[]> {
    const res = await fetch(`${getCronBase()}/status`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur status Cron.");
    return data.executions;
  },

  async triggerCron(jobName: string = "run-all"): Promise<any> {
    const endpoint = jobName === "run-all" ? `${getCronBase()}/run-all` : `${getCronBase()}/run/${jobName}`;
    const res = await fetch(endpoint, { method: "POST" });
    return res.json();
  },

  async getDbMode(): Promise<{ success: boolean; activeMode: "dev" | "prod"; sqlite: any; supabase: any }> {
    const res = await adminFetch(`${getApiBase()}/config/db-mode`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur statut BDD.");
    return data;
  },

  async setDbMode(mode: "dev" | "prod"): Promise<any> {
    const res = await adminFetch(`${getApiBase()}/config/db-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur bascule BDD.");
    return data;
  },

  async getAuditLogs(): Promise<any[]> {
    const res = await adminFetch(`${getApiBase()}/audit-logs`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération journal d'audit.");
    return data.logs;
  },

  async simulateSenditWebhook(payload: any): Promise<any> {
    const root = getBackendUrl().replace(/\/admin\/?$/, "").replace(/\/api\/?$/, "");
    const res = await fetch(`${root}/api/webhooks/sendit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sendit-signature": "dummy_signature",
      },
      body: JSON.stringify({
        event: "delivery.status.update",
        ...payload,
      }),
    });
    return res.json();
  }
};
