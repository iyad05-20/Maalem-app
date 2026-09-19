export interface CallbackResult {
  valid: boolean; // signature/hash OK ?
  paymentIntentId: string | null;
  success: boolean; // paiement accepté côté provider ?
  providerRef: string | null; // id de transaction chez le provider
  raw: Record<string, unknown>;
}

export interface PaymentIntentLike {
  id: string;
  montant: number;
}

export interface PaymentProvider {
  construireRequete(intent: PaymentIntentLike, baseUrl?: string): {
    redirectUrl: string;
    oid: string;
    amount: number;
    currency: string;
  };
  verifierCallback(data: Record<string, unknown>): CallbackResult;
}
