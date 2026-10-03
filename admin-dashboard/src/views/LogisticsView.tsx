import React, { useState } from "react";
import { Truck, Package, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Eye, RefreshCw } from "lucide-react";
import { adminAPI } from "../services/adminApi";

interface LogisticsViewProps {
  orders: any[];
}

export const LogisticsView: React.FC<LogisticsViewProps> = ({ orders }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const now = Date.now();

  // Helper pour identifier une alerte retard client (C01: ≥ 5 jours depuis expédition sans validation)
  const isC01Delay = (o: any) => {
    if (!["en_cours_de_transport", "livre"].includes(o.status)) return false;
    if (o.clientApprovalStatus === "approved") return false;
    const shippedMs = o.shippedAt ? new Date(o.shippedAt).getTime() : 0;
    return shippedMs > 0 && (now - shippedMs) >= 5 * 24 * 3600 * 1000;
  };

  // Helper pour identifier un signalement non reçu (C08)
  const isC08Reported = (o: any) => {
    return Boolean(o.notReceivedReportedAt);
  };

  const handleTriggerCheck = async () => {
    setRefreshing(true);
    try {
      await adminAPI.triggerDeliveryDelayCheck();
      alert("Vérification des retards logistiques et alertes C01/C08 exécutée avec succès.");
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la vérification");
    } finally {
      setRefreshing(false);
    }
  };

  // Filtrage
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.carrierName && o.carrierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.carrierTrackingNumber && o.carrierTrackingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.artisanRef && o.artisanRef.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "in_transit") return o.status === "en_cours_de_transport";
    if (statusFilter === "delivered_pending") return o.status === "livre" && o.clientApprovalStatus !== "approved";
    if (statusFilter === "delay_c01") return isC01Delay(o);
    if (statusFilter === "not_received_c08") return isC08Reported(o);

    return true;
  });

  const countTransit = orders.filter(o => o.status === "en_cours_de_transport").length;
  const countPendingApproval = orders.filter(o => o.status === "livre" && o.clientApprovalStatus !== "approved").length;
  const countDelayC01 = orders.filter(isC01Delay).length;
  const countReportedC08 = orders.filter(isC08Reported).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Truck color="var(--primary-gold)" /> Supervision des Expéditions Directes & Délais (C01 & C08)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Acheminement direct déclaré par le Maâlem, détection des retards de confirmation client (≥ 5 jours) et gestion des signalements de non-réception.
          </p>
        </div>
        <button
          onClick={handleTriggerCheck}
          disabled={refreshing}
          className="btn-gold"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "8px 14px" }}
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
          {refreshing ? "Vérification en cours…" : "Vérifier Délais & Alertes"}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        <div className="glass-panel" style={{ padding: 14, borderLeft: "4px solid #3B82F6" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Truck size={13} color="#3B82F6" /> En Cours d'Acheminement
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--text-main)", margin: "6px 0 0" }}>
            {countTransit}
          </h3>
        </div>

        <div className="glass-panel" style={{ padding: 14, borderLeft: "4px solid #D4AF37" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Clock size={13} color="#D4AF37" /> En Attente Confirmation Client
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "var(--text-main)", margin: "6px 0 0" }}>
            {countPendingApproval}
          </h3>
        </div>

        <div className="glass-panel" style={{ padding: 14, borderLeft: `4px solid ${countDelayC01 > 0 ? "#EF4444" : "#10B981"}` }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={13} color={countDelayC01 > 0 ? "#EF4444" : "#10B981"} /> Alertes Retard Client ≥ 5j (C01)
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: countDelayC01 > 0 ? "#EF4444" : "var(--text-main)", margin: "6px 0 0" }}>
            {countDelayC01}
          </h3>
        </div>

        <div className="glass-panel" style={{ padding: 14, borderLeft: `4px solid ${countReportedC08 > 0 ? "#EF4444" : "#6B7280"}` }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <ShieldAlert size={13} color={countReportedC08 > 0 ? "#EF4444" : "#6B7280"} /> Non-Réception Déclarée (C08)
          </p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: countReportedC08 > 0 ? "#EF4444" : "var(--text-main)", margin: "6px 0 0" }}>
            {countReportedC08}
          </h3>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: 0 }}>
            Journal des Expéditions & Acheminements
          </h4>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="Rechercher (ID, Transporteur, Suivi, Maâlem)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: 11,
                minWidth: 240,
              }}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "var(--bg-primary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-main)",
                fontSize: 11,
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="in_transit">En cours de livraison</option>
              <option value="delivered_pending">Livré (En attente validation)</option>
              <option value="delay_c01">⚠️ Alerte Retard ≥ 5j (C01)</option>
              <option value="not_received_c08">🚨 Non Reçu Déclaré (C08)</option>
            </select>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Commande & Artisan</th>
              <th>Mode d'Expédition</th>
              <th>N° de Suivi Déclaré</th>
              <th>Délai Estimé</th>
              <th>Statut Logistique</th>
              <th>Contrôle Délais (C01/C08)</th>
              <th>Preuves & Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((o) => {
                const c01 = isC01Delay(o);
                const c08 = isC08Reported(o);
                const tracking = o.carrierTrackingNumber || o.senditDeliveryCode;

                return (
                  <tr key={o.id}>
                    <td>
                      <p style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-main)", margin: 0 }}>
                        {o.id}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
                        Maâlem : {o.artisanName || o.artisanRef || "Atelier"} · {o.totalPrice} MAD
                      </p>
                    </td>

                    <td>
                      <span className="badge badge-info" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Truck size={10} />
                        {o.carrierName || "Expédition directe Maâlem"}
                      </span>
                    </td>

                    <td>
                      {tracking ? (
                        <code style={{ fontSize: 11, background: "rgba(45,106,79,0.15)", color: "#34D399", padding: "2px 6px", borderRadius: 4 }}>
                          {tracking}
                        </code>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                          Remise en main propre
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: 11, color: "var(--text-main)" }}>
                        {o.estimatedDeliveryDays ? `${o.estimatedDeliveryDays}j ouvrés` : "Standard (3j)"}
                      </span>
                      {o.shippedAt && (
                        <span style={{ fontSize: 9.5, color: "var(--text-muted)", display: "block" }}>
                          Parti le {new Date(o.shippedAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${o.status === "complete" ? "badge-success" : o.status === "en_cours_de_transport" ? "badge-info" : o.status === "livre" ? "badge-warning" : "badge-secondary"}`}>
                        {o.status}
                      </span>
                    </td>

                    <td>
                      {c08 ? (
                        <span className="badge badge-urgent" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <ShieldAlert size={10} /> Non Reçu (C08)
                        </span>
                      ) : c01 ? (
                        <span className="badge badge-urgent" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={10} /> Retard Client ≥ 5j (C01)
                        </span>
                      ) : o.clientApprovalStatus === "approved" ? (
                        <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={10} /> Validé client (C02)
                        </span>
                      ) : (
                        <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                          Tolérance normale
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {o.shippingProofPhoto && (
                          <a href={o.shippingProofPhoto} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "3px 6px", fontSize: 10 }}>
                            <Eye size={11} /> Preuve Envoi
                          </a>
                        )}
                        {o.vendeurDeliverySignaturePhoto && (
                          <a href={o.vendeurDeliverySignaturePhoto} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "3px 6px", fontSize: 10 }}>
                            <Eye size={11} /> Reçu Signé
                          </a>
                        )}
                        {!o.shippingProofPhoto && !o.vendeurDeliverySignaturePhoto && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Déclaration directe</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                  Aucune expédition ne correspond aux critères sélectionnés.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
