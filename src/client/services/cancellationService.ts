export interface CancellationResult {
  refundAmount: number;
  indemnityAmount: number;
  commissionAmount: number;
  totalRetained: number;
}

export function calculateCancellationRefund(order: {
  totalPrice: number;
  productType: "standard" | "personnalise";
  acceptedAt?: string | null;
  readyToShipAt?: string | null;
  shippedAt?: string | null;
  status: string;
}, cancelTimeStr?: string): CancellationResult {
  const cancelTime = cancelTimeStr ? new Date(cancelTimeStr) : new Date();

  if (order.shippedAt || order.status === "en_cours_de_transport") {
    throw new Error("annulation_impossible_commande_deja_en_cours_de_transport");
  }

  const P = order.totalPrice;

  if (order.productType === "standard") {
    return {
      refundAmount: P,
      indemnityAmount: 0,
      commissionAmount: 0,
      totalRetained: 0,
    };
  }

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

  if (diffHours <= 1.0) {
    return {
      refundAmount: P,
      indemnityAmount: 0,
      commissionAmount: 0,
      totalRetained: 0,
    };
  }

  if (order.readyToShipAt || order.status === "pret_a_expedier") {
    const isGrosMontant = P >= 1000;
    const paidAmount = isGrosMontant ? P * 0.5 : P;
    return {
      refundAmount: P - paidAmount,
      indemnityAmount: paidAmount,
      commissionAmount: 0,
      totalRetained: paidAmount,
    };
  }

  let I_th = 0.20 * P;
  if (I_th < 30) {
    I_th = 30;
  } else {
    const limitMax = P < 3000 ? 200 : 600;
    if (I_th > limitMax) {
      I_th = limitMax;
    }
  }

  let C_th = 0.05 * P;
  if (C_th < 20) {
    C_th = 20;
  } else if (C_th > 250) {
    C_th = 250;
  }

  const R_max = 0.50 * P;
  const totalTheoretical = I_th + C_th;

  let I_final = I_th;
  let C_final = C_th;

  if (totalTheoretical > R_max) {
    const k = R_max / totalTheoretical;
    I_final = I_th * k;
    C_final = C_th * k;
  }

  I_final = Math.round(I_final * 100) / 100;
  C_final = Math.round(C_final * 100) / 100;
  const totalRetained = Math.round((I_final + C_final) * 100) / 100;

  return {
    refundAmount: Math.max(0, Math.round((P - totalRetained) * 100) / 100),
    indemnityAmount: I_final,
    commissionAmount: C_final,
    totalRetained,
  };
}
