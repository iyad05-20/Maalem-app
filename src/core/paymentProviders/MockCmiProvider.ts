import crypto from "crypto";
import type { CallbackResult, PaymentIntentLike, PaymentProvider } from "./PaymentProvider";

const MOCK_STORE_KEY = process.env.MOCK_CMI_STORE_KEY ?? "dev-secret-not-for-prod";
const MOCK_BASE_URL = process.env.MOCK_CMI_BASE_URL ?? "http://localhost:3000/mock-cmi";

function signHash(oid: string, amount: number | string, status: string): string {
  const payload = `${oid}|${amount}|${status}|${MOCK_STORE_KEY}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export class MockCmiProvider implements PaymentProvider {
  construireRequete(intent: PaymentIntentLike, baseUrl?: string) {
    const base = baseUrl ?? MOCK_BASE_URL;
    return {
      redirectUrl: `${base}/pay?intent_id=${intent.id}&amount=${intent.montant}`,
      oid: intent.id,
      amount: intent.montant,
      currency: "504",
    };
  }

  verifierCallback(data: Record<string, unknown>): CallbackResult {
    const oid = data.oid as string | undefined;
    const amount = data.amount as number | string | undefined;
    const status = data.ProcReturnCode as string | undefined;
    const receivedHash = data.hash as string | undefined;

    const valid =
      !!oid && amount !== undefined && !!status && receivedHash === signHash(oid, amount, status);

    return {
      valid,
      paymentIntentId: oid ?? null,
      success: status === "00",
      providerRef: oid ? `mock-${oid.slice(0, 8)}` : null,
      raw: data,
    };
  }

  /** Utilisé uniquement par la page mock pour simuler ce que CMI enverrait. */
  static buildSignedCallback(oid: string, amount: number, success: boolean) {
    const status = success ? "00" : "05";
    return { oid, amount, ProcReturnCode: status, hash: signHash(oid, amount, status) };
  }
}
