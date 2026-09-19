import crypto from "crypto";

const MOCK_STORE_KEY = process.env.MOCK_CMI_STORE_KEY ?? "dev-secret-not-for-prod";
const MOCK_BASE_URL = process.env.MOCK_CMI_BASE_URL ?? "http://localhost:3000/mock-cmi";

function signHash(oid, amount, status) {
  const payload = `${oid}|${amount}|${status}|${MOCK_STORE_KEY}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export class MockCmiProvider {
  construireRequete(intent, baseUrl) {
    const base = baseUrl ?? MOCK_BASE_URL;
    return {
      redirectUrl: `${base}/pay?intent_id=${intent.id}&amount=${intent.montant}`,
      oid: intent.id,
      amount: intent.montant,
      currency: "504",
    };
  }

  verifierCallback(data) {
    const oid = data.oid;
    const amount = data.amount;
    const status = data.ProcReturnCode;
    const receivedHash = data.hash;

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

  static buildSignedCallback(oid, amount, success) {
    const status = success ? "00" : "05";
    return { oid, amount, ProcReturnCode: status, hash: signHash(oid, amount, status) };
  }
}
