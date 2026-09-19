export function calculateCancellationRefund(order, cancelTimeStr) {
  const cancelTime = cancelTimeStr ? new Date(cancelTimeStr) : new Date();

  if (order.shippedAt || order.status === "en_cours_de_transport") {
    throw new Error("annulation_impossible_commande_deja_en_cours_de_transport");
  }

  const P = order.totalPrice;

  // 1. Produits Standards (Art. 7.2) : Annulation libre sans frais avant transport
  if (order.productType === "standard") {
    return {
      refundAmount: P,
      indemnityAmount: 0,
      commissionAmount: 0,
      totalRetained: 0,
    };
  }

  // 2. Produits Personnalisés & Sur Commande (Art. 7.3 & 7.4)
  if (!order.acceptedAt) {
    return {
      refundAmount: P,
      indemnityAmount: 0,
      commissionAmount: 0,
      totalRetained: 0,
    };
  }

  const acceptedTime = new Date(order.acceptedAt);
  const diffHours = (cancelTime.getTime() - acceptedTime.getTime()) / (1000 * 60 * 60);

  // Fenêtre de grâce de 1 heure après validation par l'artisan
  if (diffHours <= 1.0) {
    return {
      refundAmount: P,
      indemnityAmount: 0,
      commissionAmount: 0,
      totalRetained: 0,
    };
  }

  // Passé 1h, la commande est ferme et définitive sauf retard de fabrication (>3 jours)
  throw new Error("delai_de_grace_1h_expire_annulation_impossible");
}
