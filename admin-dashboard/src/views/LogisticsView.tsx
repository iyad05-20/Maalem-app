import React from "react";
import { Truck, Package, FileText, CheckCircle2, AlertTriangle, Eye } from "lucide-react";
import { adminAPI } from "../services/adminApi";

interface LogisticsViewProps {
  orders: any[];
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ orders }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Truck color="var(--primary-gold)" /> Supervision Logistique Sendit & Transport Direct
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Suivi de l'acheminement des colis, gestion des clients injoignables et vérification des preuves d'étiquetage et de signature.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: 20 }}>
        <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: "0 0 14px" }}>
          Expéditions Actives sur le Réseau
        </h4>

        <table className="data-table">
          <thead>
            <tr>
              <th>Commande</th>
              <th>Transporteur</th>
              <th>Code Suivi Sendit</th>
              <th>Statut Logistique</th>
              <th>Injoignable (Art. 17)</th>
              <th>Preuves de Livraison</th>
            </tr>
          </thead>
          <tbody>
            {orders.length > 0 ? (
              orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <p style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-main)", margin: 0 }}>{o.id}</p>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Type : {o.productType}</p>
                  </td>
                  <td>
                    <span className={`badge ${o.transportProvider === "sendit" ? "badge-info" : "badge-warning"}`}>
                      {o.transportProvider === "sendit" ? "Sendit Express" : "Maâlem Direct"}
                    </span>
                  </td>
                  <td>
                    {o.senditDeliveryCode ? (
                      <code style={{ fontSize: 11, background: "rgba(45,106,79,0.15)", color: "#34D399", padding: "2px 6px", borderRadius: 4 }}>{o.senditDeliveryCode}</code>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>-</span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info">{o.status}</span>
                  </td>
                  <td>
                    {o.counterUnreachable > 0 ? (
                      <span className="badge badge-urgent">{o.counterUnreachable} échec(s)</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>0</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {o.senditWaybillUrl && (
                        <a href={o.senditWaybillUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "3px 6px", fontSize: 10 }}>
                          <FileText size={12} /> BL PDF
                        </a>
                      )}
                      {o.vendeurDeliverySignaturePhoto && (
                        <a href={o.vendeurDeliverySignaturePhoto} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "3px 6px", fontSize: 10 }}>
                          <Eye size={12} /> Reçu Signé
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                  Aucune expédition active sur le réseau.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Lab de Simulation Webhook Sendit (Déplacé depuis le client pour tests Admin) */}
      <div className="glass-panel" style={{ padding: 20, border: "1px solid rgba(212,175,55,0.2)" }}>
        <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--primary-gold)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
          🧪 Simulateur d'Événements Transporteur Sendit (Lab Admin)
        </h4>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 14px", lineHeight: 1.4 }}>
          Simulez la réception des webhooks officiels Sendit (Livreur) pour tester les changements de statuts, l'ouverture des fenêtres de contestation et les libérations de séquestre sans attendre le livreur réel.
        </p>

        <form onSubmit={async (e) => {
          e.preventDefault();
          const form = e.target as any;
          const orderId = form.orderId.value;
          const status = form.status.value;
          const trackingCode = form.trackingCode.value;
          if (!orderId) return;

          try {
            await adminAPI.simulateSenditWebhook({
              code: trackingCode || `SND-${orderId}`,
              reference: orderId,
              status,
              updated_at: new Date().toISOString(),
            });
            alert(`Événement Sendit [${status}] déclenché avec succès pour la commande ${orderId}.`);
            window.location.reload();
          } catch (err: any) {
            alert(err.message || "Erreur simulation webhook");
          }
        }} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1.5fr auto", gap: 12, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Commande Cible</label>
            <select name="orderId" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg-primary)", color: "var(--text-main)", border: "1px solid var(--border-color)", fontSize: 11 }}>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.id} ({o.status} - {o.totalPrice} MAD)</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Événement Sendit</label>
            <select name="status" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg-primary)", color: "var(--text-main)", border: "1px solid var(--border-color)", fontSize: 11 }}>
              <option value="DELIVERED">DELIVERED (Colis Livré - Art. 11)</option>
              <option value="UNREACHABLE">UNREACHABLE (Client Injoignable - Art. 17)</option>
              <option value="REJECTED">REJECTED (Colis Refusé par le Client)</option>
              <option value="RETURNED">RETURNED (Retour à l'Atelier)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Code Suivi (Optionnel)</label>
            <input type="text" name="trackingCode" placeholder="Ex: SND-12345" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, background: "var(--bg-primary)", color: "var(--text-main)", border: "1px solid var(--border-color)", fontSize: 11 }} />
          </div>

          <button type="submit" className="btn-gold" style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
            ⚡ Déclencher Webhook
          </button>
        </form>
      </div>

    </div>
  );
};
