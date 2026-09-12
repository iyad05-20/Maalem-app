import type { ClientOrder, ClientWallet, WalletTransaction } from "../types/clientPayment";
import { authService } from "./authService";

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
const BACKEND_ROOT = API_BASE.replace(/\/api\/?$/, '');

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...authService.getAuthHeaders(),
    ...extra
  };
}

const LOCAL_STORAGE_KEY_ORDERS = "vork_client_orders_v2";
const LOCAL_STORAGE_KEY_WALLET = "vork_client_wallet_v2";

const INITIAL_DEMO_ORDERS: ClientOrder[] = [
  {
    id: "ord-std-001",
    clientRef: "client-me",
    artisanRef: "artisan-fes",
    artisanName: "Maâlem Driss - Fès",
    productTitle: "Lanterne en Cuivre Ciselé",
    productImage: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=60",
    totalPrice: 450,
    productType: "standard",
    status: "livre",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tranche: "total_100",
  },
  {
    id: "ord-perso-002",
    clientRef: "client-me",
    artisanRef: "artisan-kech",
    artisanName: "Maâlem Hassan - Marrakech",
    productTitle: "Tapis Zanafi Sur-Mesure",
    productImage: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=60",
    totalPrice: 1800,
    productType: "personnalise",
    status: "en_preparation",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    depositAmount: 900,
    tranche: "acompte_50",
  },
  {
    id: "ord-std-003",
    clientRef: "client-me",
    artisanRef: "artisan-safi",
    artisanName: "Atelier Céramique - Safi",
    productTitle: "Vase en Céramique Bleu Majorelle",
    productImage: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=60",
    totalPrice: 320,
    productType: "standard",
    status: "en_attente_paiement",
    createdAt: new Date().toISOString(),
    tranche: "total_100",
  },
];

function getStoredOrders(): ClientOrder[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_ORDERS);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(INITIAL_DEMO_ORDERS));
    return INITIAL_DEMO_ORDERS;
  }
  return JSON.parse(data) as ClientOrder[];
}

function saveOrders(orders: ClientOrder[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_ORDERS, JSON.stringify(orders));
}

function getStoredWallet(userId: string): ClientWallet {
  const data = localStorage.getItem(`${LOCAL_STORAGE_KEY_WALLET}_${userId}`);
  if (!data) {
    const initial: ClientWallet = {
      userId,
      balance: 600,
      pendingWithdrawals: 0,
      transactions: [
        {
          id: "tx-init-1",
          type: "annulation_remboursement_client",
          montant: 600,
          compteDebit: "escrow[ord-old-99]",
          compteCredit: `wallet[${userId}]`,
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: "Remboursement commande annulée",
        },
      ],
    };
    localStorage.setItem(`${LOCAL_STORAGE_KEY_WALLET}_${userId}`, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data) as ClientWallet;
}

function saveWallet(wallet: ClientWallet): void {
  localStorage.setItem(`${LOCAL_STORAGE_KEY_WALLET}_${wallet.userId}`, JSON.stringify(wallet));
}

export const clientWalletAPI = {
  async fetchOrders(_clientRef = "client-me"): Promise<ClientOrder[]> {
    try {
      const res = await fetch(`${API_BASE}/client/orders?clientRef=${_clientRef}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json() as ClientOrder[];
        if (data && data.length > 0) return data;
      }
    } catch {
      // Fallback local dev
    }
    return getStoredOrders();
  },

  async createOrder(
    clientRef: string,
    artisanRef: string,
    totalPrice: number,
    productType: "standard" | "personnalise" = "standard",
    productTitle?: string,
    productImage?: string,
    artisanName?: string
  ): Promise<ClientOrder> {
    try {
      const res = await fetch(`${API_BASE}/client/orders`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ clientRef, artisanRef, artisanName, totalPrice, productType, productTitle, productImage }),
      });
      if (res.ok) {
        const backendOrder = await res.json() as ClientOrder;
        // Enrich backend order with local display details
        backendOrder.productTitle = productTitle;
        backendOrder.productImage = productImage;
        backendOrder.artisanName = artisanName;

        const current = getStoredOrders();
        current.unshift(backendOrder);
        saveOrders(current);
        return backendOrder;
      }
    } catch {
      // Fallback local dev
    }

    const newOrderId = `ord-${Date.now()}`;
    const newOrder: ClientOrder = {
      id: newOrderId,
      clientRef,
      artisanRef,
      artisanName: artisanName || "Maâlem Abdelkader",
      productTitle,
      productImage,
      totalPrice,
      productType,
      status: "en_attente_paiement",
      createdAt: new Date().toISOString(),
      tranche: "total_100",
    };
    const current = getStoredOrders();
    current.unshift(newOrder);
    saveOrders(current);
    return newOrder;
  },

  async payOrder(orderId: string, choice: "deposit" | "total" = "deposit"): Promise<{ success: boolean; redirectUrl: string; amount: number; tranche: string }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/pay`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ choice }),
      });
      if (res.ok) return await res.json() as { success: boolean; redirectUrl: string; amount: number; tranche: string };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");

    const isGrosMontant = order.totalPrice >= 1000;
    const amount = (isGrosMontant && choice === "deposit") ? Math.round(order.totalPrice * 0.5) : order.totalPrice;
    const tranche = (isGrosMontant && choice === "deposit") ? "acompte_50" : "total_100";

    order.status = (isGrosMontant && choice === "deposit") ? "acompte_verse" : "payee_integralement";
    order.depositAmount = amount;
    order.tranche = tranche as "total_100" | "acompte_50";
    saveOrders(orders);

    return { success: true, redirectUrl: `${BACKEND_ROOT}/mock-cmi/pay?intent_id=mock-intent-${orderId}&amount=${amount}`, amount, tranche };
  },

  async cancelOrder(orderId: string): Promise<{ success: boolean; refundAmount: number }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/cancel`, { 
        method: "POST", 
        headers: getHeaders() 
      });
      if (res.ok) return await res.json() as { success: boolean; refundAmount: number };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");

    if (order.status === "en_cours_de_transport" || order.status === "livre" || order.status === "complete") {
      throw new Error("Annulation impossible : la commande est déjà expédiée ou livrée.");
    }

    if (order.productType === "personnalise" && order.acceptedAt) {
      const diffMinutes = (Date.now() - new Date(order.acceptedAt).getTime()) / (1000 * 60);
      if (diffMinutes > 60) {
        throw new Error("Annulation impossible : Pour un produit sur-mesure, l'annulation doit se faire dans l'heure suivant l'acceptation.");
      }
    }

    const refundAmount = order.depositAmount ?? order.totalPrice;
    order.status = "annulee";
    saveOrders(orders);

    const wallet = getStoredWallet(order.clientRef);
    wallet.balance = Math.round((wallet.balance + refundAmount) * 100) / 100;
    const tx: WalletTransaction = {
      id: `tx-cancel-${Date.now()}`,
      type: "annulation_remboursement_client",
      montant: refundAmount,
      compteDebit: `escrow[${orderId}]`,
      compteCredit: `wallet[${order.clientRef}]`,
      createdAt: new Date().toISOString(),
      metadata: `Remboursement annulation commande ${order.id}`,
    };
    wallet.transactions.unshift(tx);
    saveWallet(wallet);

    return { success: true, refundAmount };
  },

  async requestReturn(orderId: string, mode: "sendit" | "propres_moyens", returnShippingFee = 35): Promise<{ success: boolean; returnId: string }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/return`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ mode, returnShippingFee })
      });
      if (res.ok) return await res.json() as { success: boolean; returnId: string };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    if (order.productType !== "standard") throw new Error("Le droit de rétractation de 7 jours ne s'applique qu'aux produits standards.");
    if (order.status !== "livre") throw new Error("Le retour n'est possible qu'après la livraison.");

    order.status = "retour_initie";
    order.carrierChoice = mode;
    order.returnShippingFee = mode === "sendit" ? returnShippingFee : 0;
    order.returnStatus = "initie";
    saveOrders(orders);

    return { success: true, returnId: `ret-${Date.now()}` };
  },

  async createDispute(orderId: string, reason: string, photos: string[], type: string = "vice_cache_3mois"): Promise<{ success: boolean; disputeId: string }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/dispute`, { 
        method: "POST", 
        headers: getHeaders(), 
        body: JSON.stringify({ type, reason, clientEvidencePhotos: photos }) 
      });
      if (res.ok) return await res.json() as { success: boolean; disputeId: string };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");

    order.status = "en_reclamation";
    order.disputeReason = reason;
    order.disputeStatus = "ouvert";
    saveOrders(orders);

    return { success: true, disputeId: `disp-${Date.now()}` };
  },

  async getWallet(userId = "client-me"): Promise<ClientWallet> {
    try {
      const res = await fetch(`${API_BASE}/client/wallet/${userId}/balance`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json() as { balance: number };
        return { userId, balance: data.balance, pendingWithdrawals: 0, transactions: [] };
      }
    } catch {
      // Fallback local dev
    }
    return getStoredWallet(userId);
  },

  async requestWithdrawal(userId = "client-me", amount: number, rib: string): Promise<{ success: boolean; withdrawalId: string }> {
    if (rib.length !== 24 || !/^\d+$/.test(rib)) throw new Error("Le RIB doit comporter exactement 24 chiffres.");
    if (amount <= 0) throw new Error("Montant invalide.");

    try {
      const res = await fetch(`${API_BASE}/client/wallet/${userId}/withdraw`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ amount, rib })
      });
      if (res.ok) return await res.json() as { success: boolean; withdrawalId: string };
    } catch {
      // Fallback local dev
    }

    const wallet = getStoredWallet(userId);
    if (wallet.balance < amount) throw new Error("Solde disponible insuffisant sur votre Wallet Vork.");

    wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
    wallet.pendingWithdrawals = Math.round((wallet.pendingWithdrawals + amount) * 100) / 100;
    const withdrawalId = `wdr-${Date.now()}`;

    const tx: WalletTransaction = {
      id: withdrawalId,
      type: "retrait_demande_rib",
      montant: amount,
      compteDebit: `wallet[${userId}]`,
      compteCredit: "pending_withdrawals",
      createdAt: new Date().toISOString(),
      metadata: `Demande virement RIB (****${rib.slice(-4)}) - Exécution prévue Lundi`,
    };
    wallet.transactions.unshift(tx);
    saveWallet(wallet);

    return { success: true, withdrawalId };
  },

  async extendSellerDeadline(orderId: string, hours: 24 | 48 | 72): Promise<{ success: boolean; extendedHours: number }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/extend-deadline`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ hours }),
      });
      if (res.ok) return await res.json() as { success: boolean; extendedHours: number };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    saveOrders(orders);
    return { success: true, extendedHours: hours };
  },

  async cancelReturnRequest(orderId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/cancel-return`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json() as { success: boolean };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    order.status = "livre";
    saveOrders(orders);
    return { success: true };
  },

  // Approbation client de la réception (Livraison Vendeur - Priorité 11/09/2026 & Art. 13/18 CGV)
  async approveReceipt(orderId: string): Promise<{ success: boolean; clientApprovalStatus?: string; withdrawalExpiresAt?: string; escrowReleasedAt?: string }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/deliver`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    order.status = "livre";
    order.clientApprovalStatus = "approved";
    order.deliveredAt = order.deliveredAt || new Date().toISOString();
    order.receptionValidatedBy = "client";
    if (order.productType === "standard") {
      order.withdrawalExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      order.escrowActionChoice = "pending";
    } else {
      order.escrowReleasedAt = new Date().toISOString();
      order.escrowActionChoice = "released_to_wallet";
    }
    saveOrders(orders);
    return { success: true, clientApprovalStatus: "approved", withdrawalExpiresAt: order.withdrawalExpiresAt || undefined, escrowReleasedAt: order.escrowReleasedAt || undefined };
  },

  // Tâche 3 : Validation manuelle de la réception par le client (Art. 4.3 C)
  async validateDelivery(orderId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/deliver`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json() as { success: boolean };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    order.clientApprovalStatus = "approved";
    order.status = "livre";
    saveOrders(orders);
    return { success: true };
  },

  // Tâche 4 : Déclaration de non-réception 24h post-validation automatique (Art. 4.3 D)
  async declareNotReceived(orderId: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/declare-not-received`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) return await res.json() as { success: boolean };
    } catch {
      // Fallback local dev
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error("Commande introuvable");
    order.status = "en_reclamation";
    saveOrders(orders);
    return { success: true };
  },

  async getDistricts(querystring?: string): Promise<{ success: boolean; data: { id: number; name: string }[] }> {
    try {
      const query = querystring ? `?querystring=${encodeURIComponent(querystring)}` : "";
      const res = await fetch(`${API_BASE}/districts${query}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const fallback = [
      { id: 46, name: "Casablanca" },
      { id: 1, name: "Rabat" },
      { id: 2, name: "Marrakech" },
      { id: 3, name: "Fès" },
      { id: 4, name: "Tanger" },
      { id: 5, name: "Salé" },
      { id: 6, name: "Meknès" },
      { id: 7, name: "Agadir" },
      { id: 8, name: "Oujda" },
      { id: 9, name: "Kenitra" },
      { id: 10, name: "Tétouan" },
      { id: 11, name: "Temara" },
      { id: 12, name: "Safi" },
      { id: 13, name: "Mohammedia" },
      { id: 14, name: "Khouribga" },
      { id: 15, name: "El Jadida" },
      { id: 16, name: "Beni Mellal" },
      { id: 17, name: "Nador" },
      { id: 18, name: "Dar Bouazza" },
      { id: 19, name: "Taza" },
      { id: 20, name: "Settat" },
      { id: 21, name: "Berrechid" },
      { id: 22, name: "Khemisset" },
      { id: 23, name: "Guelmim" },
      { id: 24, name: "Larache" },
      { id: 25, name: "Ksar El Kebir" },
      { id: 26, name: "Berkane" },
      { id: 27, name: "Errachidia" },
      { id: 28, name: "Bouskoura" },
      { id: 29, name: "Fkih Ben Salah" },
      { id: 30, name: "Oued Zem" },
      { id: 31, name: "Sidi Slimane" },
      { id: 32, name: "Taroudant" },
      { id: 33, name: "Kelaat Sraghna" },
      { id: 34, name: "Benguerir" },
      { id: 35, name: "Essaouira" },
      { id: 36, name: "Tiznit" },
      { id: 37, name: "Azrou" },
      { id: 38, name: "Midelt" },
      { id: 39, name: "Ouarzazate" },
      { id: 40, name: "Al Hoceima" },
      { id: 41, name: "Chefchaouen" },
      { id: 42, name: "Dakhla" },
      { id: 43, name: "Laâyoune" }
    ];
    let data = fallback;
    if (querystring) {
      data = fallback.filter(d => d.name.toLowerCase().includes(querystring.toLowerCase()));
    }
    return { success: true, data };
  },

  async shipOrder(orderId: string, deliveryData: any): Promise<{ success: boolean; status: string; senditDeliveryCode: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "en_cours_de_transport";
      order.senditDeliveryCode = `SND-${Date.now()}`;
      saveOrders(orders);
      return { success: true, status: "en_cours_de_transport", senditDeliveryCode: order.senditDeliveryCode };
    }
    throw new Error("Commande introuvable");
  },

  async acceptOrder(orderId: string): Promise<{ success: boolean; status: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) return await res.json() as { success: boolean; status: string };
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "en_preparation";
      order.acceptedAt = new Date().toISOString();
      saveOrders(orders);
      return { success: true, status: "en_preparation" };
    }
    throw new Error("Commande introuvable");
  },

  async getOrderLabel(orderId: string, code: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/label?code=${code}`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, labelUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" };
  },

  async shipSenditStep1(orderId: string, deliveryData: any): Promise<{ success: boolean; senditDeliveryCode: string; waybillUrl: string; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/ship-sendit-step1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryData),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.senditDeliveryCode = `SND-MOCK-${Date.now()}`;
      order.senditWaybillUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
      saveOrders(orders);
      return { success: true, senditDeliveryCode: order.senditDeliveryCode, waybillUrl: order.senditWaybillUrl };
    }
    throw new Error("Commande introuvable");
  },

  async shipSenditStep2(orderId: string, blAttachedPhoto: string): Promise<{ success: boolean; status: string; senditDeliveryCode: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/ship-sendit-step2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blAttachedPhoto }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "en_cours_de_transport";
      order.senditWaybillPhoto = blAttachedPhoto;
      order.shippedAt = new Date().toISOString();
      saveOrders(orders);
      return { success: true, status: "en_cours_de_transport", senditDeliveryCode: order.senditDeliveryCode || `SND-${Date.now()}` };
    }
    throw new Error("Commande introuvable");
  },

  async shipVendeurSelf(orderId: string, { transportDurationDays = 7 }: { transportDurationDays?: number }): Promise<{ success: boolean; status: string; transportProvider: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/ship-vendeur`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transportDurationDays }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "en_cours_de_transport";
      order.transportProvider = "vendeur";
      order.shippedAt = new Date().toISOString();
      saveOrders(orders);
      return { success: true, status: "en_cours_de_transport", transportProvider: "vendeur" };
    }
    throw new Error("Commande introuvable");
  },

  async completeVendeurDelivery(orderId: string, { signaturePhoto }: { signaturePhoto: string }): Promise<{ success: boolean; status: string; escrowReleasedAt?: string; withdrawalExpiresAt?: string }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/complete-vendeur-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signaturePhoto }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "livre";
      order.deliveredAt = new Date().toISOString();
      order.receptionValidatedBy = "vendeur";
      order.vendeurDeliverySignaturePhoto = signaturePhoto;
      saveOrders(orders);
      return { success: true, status: "livre" };
    }
    throw new Error("Commande introuvable");
  },

  async uploadPrepPhotos(orderId: string, photos: string[]): Promise<{ success: boolean; count: number }> {
    try {
      const res = await fetch(`${API_BASE}/artisan/orders/${orderId}/prep-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return { success: true, count: photos.length };
  },

  async claimNonReception(orderId: string, reason: string): Promise<{ success: boolean; status: string }> {
    try {
      const res = await fetch(`${API_BASE}/client/orders/${orderId}/claim-non-reception`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
      });
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    const orders = getStoredOrders();
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = "en_reclamation";
      order.nonReceptionClaimedAt = new Date().toISOString();
      saveOrders(orders);
      return { success: true, status: "en_reclamation" };
    }
    throw new Error("Commande introuvable");
  },

  async getVendorProfile(vendorRef: string = "artisan-1"): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/artisan/vendor/${vendorRef}/profile`);
      if (res.ok) return await res.json();
    } catch {
      // Fallback
    }
    return {
      success: true,
      profile: {
        id: vendorRef,
        warningCountCurrentMonth: 0,
        suspensionStatus: "active",
        suspendedUntil: null,
      },
      warnings: [],
    };
  },

  async simulateWebhook(payload: any): Promise<any> {
    const res = await fetch(`${BACKEND_ROOT}/api/webhooks/sendit`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-sendit-signature": "dummy_signature"
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // ⏰ Déclencheur et monitoring des Cron Jobs
  async triggerCronJob(jobName: string = "run-all"): Promise<any> {
    const endpoint = jobName === "run-all" ? `${BACKEND_ROOT}/api/cron/run-all` : `${BACKEND_ROOT}/api/cron/run/${jobName}`;
    const res = await fetch(endpoint, { method: "POST" });
    return res.json();
  },

  async getCronStatus(): Promise<any> {
    const res = await fetch(`${BACKEND_ROOT}/api/cron/status`);
    return res.json();
  }
};
