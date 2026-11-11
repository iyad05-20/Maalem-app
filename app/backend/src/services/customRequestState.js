import { eq } from "drizzle-orm";
import { customRequests } from "../core/db/schema.js";

export const OPEN_MARKET_STATUSES = ["en_attente_artisan", "devis_recu"];

export function safeJsonParse(raw, fallback = {}) {
  if (!raw) return fallback;
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Source unique en mémoire des demandes de démonstration du Marché Public.
 */
export const memoryCustomRequests = [
  {
    id: "req-101",
    clientName: "Laila Bennani",
    category: "Céramique & Poterie",
    title: "Ensemble de 12 assiettes Zellige Bleu Fassi",
    description: "Je recherche un ensemble personnalisé de 12 grandes assiettes de service avec motifs géométriques bleus traditionnels de Fès.",
    budget: "1 800 MAD",
    deliveryCity: "Casablanca",
    status: "en_attente_artisan",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    quotes: [
      {
        artisanRef: "artisan_abdelkader",
        artisanName: "Maâlem Abdelkader",
        proposedPrice: 1650,
        confectionDays: 8,
        note: "Réalisable à la main dans notre atelier de Fès avec cuisson traditionnelle.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      }
    ]
  },
  {
    id: "req-102",
    clientName: "Karim Tazi",
    category: "Cuir & Maroquinerie",
    title: "Pouf en cuir naturel teinté terracotta sur-mesure",
    description: "Recherche artisan maroquinier pour réaliser un pouf rond de 60cm de diamètre en cuir véritable teinté à la main.",
    budget: "900 MAD",
    deliveryCity: "Rabat",
    status: "en_attente_artisan",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
    quotes: []
  },
  {
    id: "req-103",
    clientName: "Sofia El Amrani",
    category: "Textile & Caftans",
    title: "Selham Royal en laine blanche tressé fil d'or",
    description: "Commande spéciale pour un événement familial. Selham traditionnel cousu main avec Sfifa d'or.",
    budget: "3 500 MAD",
    deliveryCity: "Marrakech",
    status: "en_attente_artisan",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
    quotes: []
  }
];

/**
 * Retourne true uniquement si la demande est toujours ouverte aux propositions sur le marché.
 */
export function isRequestOpenOnMarket(record, parsedTags = null) {
  if (!record) return false;
  const tags = parsedTags ?? safeJsonParse(record.customizationTags, {});
  const status = record.status || "en_attente_artisan";
  if (!OPEN_MARKET_STATUSES.includes(status)) return false;
  if (tags.chosenQuote || tags.removedFromPublicMarketAt || record.removedFromPublicMarketAt) {
    return false;
  }
  return true;
}

/**
 * Retire définitivement une demande du Marché Public (DB + cache RAM)
 * dès qu'un vendeur a été accepté ou que la commande associée est réalisée.
 */
export async function closeCustomRequestOnMarket(dbOrTx, requestId, options = {}) {
  if (!requestId) return null;
  const now = new Date().toISOString();
  const {
    status = "offre_choisie",
    chosenQuote = null,
    chosenArtisanRef = null,
    totalPrice = null,
    reason = "accepted_or_realized",
  } = options;

  // 1. Retrait immédiat du cache RAM s'il y figurait
  const memIdx = memoryCustomRequests.findIndex((r) => r.id === requestId);
  if (memIdx !== -1) {
    memoryCustomRequests.splice(memIdx, 1);
  }

  // 2. Mise à jour atomique en DB
  if (!dbOrTx) return null;
  try {
    const [existing] = await dbOrTx.select().from(customRequests).where(eq(customRequests.id, requestId));
    if (!existing) return null;

    const tags = safeJsonParse(existing.customizationTags, {});
    if (chosenQuote) {
      tags.chosenQuote = chosenQuote;
    }
    tags.removedFromPublicMarketAt = tags.removedFromPublicMarketAt || now;
    tags.marketClosureReason = reason;

    const updateSet = {
      status,
      customizationTags: JSON.stringify(tags),
      updatedAt: now,
    };
    if (chosenArtisanRef) updateSet.artisanRef = chosenArtisanRef;
    if (totalPrice !== null && totalPrice !== undefined) updateSet.totalPrice = totalPrice;

    await dbOrTx.update(customRequests).set(updateSet).where(eq(customRequests.id, requestId));
    return { existing, tags };
  } catch (err) {
    console.warn(`[MARKET-STATE] ⚠️ Échec retrait marché pour ${requestId}:`, err.message);
    return null;
  }
}

