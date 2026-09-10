import type { 
  ArtisanOrder, 
  ArtisanReturn, 
  ArtisanDispute, 
  ArtisanWallet, 
  ArtisanProfileHealth, 
  ArtisanProduct,
  ArtisanNotification,
  ArtisanProfileDetails,
  ArtisanStats,
  CustomOrderRequest
} from "../types/artisanTypes";
import { artisanAuthService } from "./artisanAuthService";

export function getBackendUrl(): string {
  const custom = localStorage.getItem("artisan_target_backend_url");
  if (custom && custom.trim()) {
    return custom.replace(/\/$/, "");
  }
  const envUrl = ((import.meta as any).env?.VITE_BACKEND_URL as string) || "http://localhost:3001/api";
  return envUrl.replace(/\/$/, "");
}

export function setBackendUrl(url: string) {
  if (!url || url.trim() === "http://localhost:3001/api") {
    localStorage.removeItem("artisan_target_backend_url");
  } else {
    localStorage.setItem("artisan_target_backend_url", url.trim());
  }
}

const getApiBase = () => `${getBackendUrl()}/artisan`;

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...artisanAuthService.getAuthHeaders(),
    ...extra,
  };
}

export function getCurrentArtisanRef(override?: string): string {
  if (override && override !== "artisan-1" && override !== "artisan_abdelkader") return override;
  const user = artisanAuthService.getStoredUser();
  return user?.id || override || "artisan_abdelkader";
}

export const artisanAPI = {
  async getOrders(artisanRef?: string): Promise<ArtisanOrder[]> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/orders?artisanRef=${ref}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération commandes.");
    return data.orders;
  },

  async acceptOrder(orderId: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/accept`, {
      method: "POST",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur lors de l'acceptation.");
    return data;
  },

  async refuseOrder(orderId: string, reason: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/refuse`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur lors du refus.");
    return data;
  },

  async uploadPrepPhotos(orderId: string, photos: string[]): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/prep-photos`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ photos }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur upload photos.");
    return data;
  },

  async shipSenditStep1(orderId: string, deliveryData: any): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/ship-sendit-step1`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(deliveryData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur étape 1 Sendit.");
    return data;
  },

  async shipSenditStep2(orderId: string, blAttachedPhoto: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/ship-sendit-step2`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ blAttachedPhoto }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur étape 2 Sendit.");
    return data;
  },

  async shipVendeur(orderId: string, transportDurationDays: number = 7): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/ship-vendeur`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ transportDurationDays }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur expédition directe.");
    return data;
  },

  async completeVendeurDelivery(orderId: string, signaturePhoto: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/orders/${orderId}/complete-delivery`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ signaturePhoto }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur validation livraison.");
    return data;
  },

  async getReturns(): Promise<ArtisanReturn[]> {
    const res = await fetch(`${getApiBase()}/returns`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération retours.");
    return data.returns;
  },

  async confirmReturn(returnId: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/returns/${returnId}/confirm`, {
      method: "POST",
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur validation retour.");
    return data;
  },

  async getDisputes(): Promise<ArtisanDispute[]> {
    const res = await fetch(`${getApiBase()}/disputes`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération litiges.");
    return data.disputes;
  },

  async respondDispute(disputeId: string, artisanResponse: string, artisanEvidencePhotos: string[] = []): Promise<any> {
    const res = await fetch(`${getApiBase()}/disputes/${disputeId}/respond`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ artisanResponse, artisanEvidencePhotos }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur envoi réponse litige.");
    return data;
  },

  async getWallet(artisanRef?: string): Promise<ArtisanWallet> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/wallet?artisanRef=${ref}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur récupération portefeuille.");
    return data.wallet;
  },

  async requestWithdrawal(amount: number, rib: string, artisanRef?: string): Promise<any> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/wallet/withdraw`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ artisanRef: ref, amount, rib }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur demande de virement.");
    return data;
  },

  async getProfileHealth(artisanRef?: string): Promise<{ profile: ArtisanProfileHealth; warnings: any[] }> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/profile/health?artisanRef=${ref}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur statut boutique.");
    return { profile: data.profile, warnings: data.warnings || [] };
  },

  async getNotifications(artisanRef?: string): Promise<ArtisanNotification[]> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/notifications?artisanRef=${ref}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur notifications.");
    return data.notifications;
  },

  async getProfileDetails(): Promise<ArtisanProfileDetails> {
    const res = await fetch(`${getApiBase()}/profile/details`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur profil.");
    return data.profileDetails;
  },

  async updateProfileDetails(details: Partial<ArtisanProfileDetails>): Promise<ArtisanProfileDetails> {
    const res = await fetch(`${getApiBase()}/profile/details`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(details),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur mise à jour profil.");
    return data.profileDetails;
  },

  async getStats(artisanRef?: string): Promise<ArtisanStats> {
    const ref = getCurrentArtisanRef(artisanRef);
    const res = await fetch(`${getApiBase()}/stats?artisanRef=${ref}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur statistiques.");
    return data.stats;
  },

  async getProducts(): Promise<ArtisanProduct[]> {
    const res = await fetch(`${getApiBase()}/products`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur catalogue.");
    return data.products;
  },

  async createProduct(productData: any): Promise<any> {
    const storedUser = artisanAuthService.getStoredUser();
    const enrichedData = {
      artisanRef: getCurrentArtisanRef(),
      artisanName: storedUser?.fullName || "Maâlem Iyad Outahadout",
      ...productData,
    };
    const res = await fetch(`${getApiBase()}/products`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(enrichedData),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur création produit.");
    return data;
  },

  async getCustomRequests(category = "Toutes"): Promise<CustomOrderRequest[]> {
    const res = await fetch(`${getApiBase()}/custom-requests?category=${encodeURIComponent(category)}`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur marché sur-mesure.");
    return data.requests;
  },

  async submitCustomQuote(requestId: string, proposedPrice: number, confectionDays: number, note: string): Promise<any> {
    const res = await fetch(`${getApiBase()}/custom-requests/${requestId}/quote`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ proposedPrice, confectionDays, note }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Erreur soumission devis.");
    return data;
  }
};
