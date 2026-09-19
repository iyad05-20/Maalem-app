import React, { useState, useEffect } from "react";
import { Sidebar, type AdminTab } from "./components/Sidebar";
import { Header } from "./components/Header";
import { OverviewView } from "./views/OverviewView";
import { DisputesView } from "./views/DisputesView";
import { VendorsView } from "./views/VendorsView";
import { EscrowLedgerView } from "./views/EscrowLedgerView";
import { LogisticsView } from "./views/LogisticsView";
import { CronMonitorView } from "./views/CronMonitorView";
import { DisputeWorkbenchModal } from "./components/DisputeWorkbenchModal";
import { adminAPI } from "./services/adminApi";
import type { 
  AdminStats, 
  DisputeDossier, 
  VendorProfile, 
  VendorWarning, 
  WithdrawalRequest, 
  LedgerEntry, 
  CronExecution 
} from "./types/adminTypes";

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState(false);

  // App State
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [disputes, setDisputes] = useState<DisputeDossier[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<VendorProfile[]>([]);
  const [vendorWarnings, setVendorWarnings] = useState<VendorWarning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [logisticsOrders, setLogisticsOrders] = useState<any[]>([]);
  const [cronExecutions, setCronExecutions] = useState<CronExecution[]>([]);

  // Selected Dispute for Workbench Modal
  const [activeDisputeModal, setActiveDisputeModal] = useState<DisputeDossier | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        disputesRes,
        vendorsRes,
        withdrawalsRes,
        ledgerRes,
        logisticsRes,
        cronRes
      ] = await Promise.all([
        adminAPI.getStats().catch(() => null),
        adminAPI.getDisputes().catch(() => []),
        adminAPI.getVendors().catch(() => ({ profiles: [], warnings: [] })),
        adminAPI.getWithdrawals().catch(() => []),
        adminAPI.getLedger().catch(() => []),
        adminAPI.getLogistics().catch(() => []),
        adminAPI.getCronStatus().catch(() => [])
      ]);

      if (statsRes) setStats(statsRes);
      setDisputes(disputesRes);
      setVendorProfiles(vendorsRes.profiles || []);
      setVendorWarnings(vendorsRes.warnings || []);
      setWithdrawals(withdrawalsRes);
      setLedger(ledgerRes);
      setLogisticsOrders(logisticsRes);
      setCronExecutions(cronRes);
    } catch (err: any) {
      console.error("[ADMIN] Erreur lors du chargement des données:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleResolveDispute = async (
    id: string, 
    resolutionType: "refund_total" | "refund_partial" | "replacement" | "rejected", 
    arbitrationDecision: string, 
    arbitrationAmount: number = 0
  ) => {
    await adminAPI.resolveDispute(id, resolutionType, arbitrationDecision, arbitrationAmount);
    await loadAllData();
  };

  const handleIssueWarning = async (vendorId: string, reason: string, orderId?: string) => {
    await adminAPI.issueVendorWarning(vendorId, reason, orderId);
    await loadAllData();
  };

  const handleUpdateVendorStatus = async (vendorId: string, status: string) => {
    await adminAPI.updateVendorStatus(vendorId, status);
    await loadAllData();
  };

  const handleProcessWithdrawal = async (id: string, status: "processed" | "rejected") => {
    await adminAPI.processWithdrawal(id, status);
    await loadAllData();
  };

  const handleTriggerCron = async (jobName: string) => {
    await adminAPI.triggerCron(jobName);
    await loadAllData();
  };

  const openDisputesCount = disputes.filter(d => ["en_arbitrage_admin", "en_attente_artisan"].includes(d.status)).length;
  const warnedVendorsCount = vendorProfiles.filter(v => v.warningCountCurrentMonth >= 2).length;

  const getHeaderInfo = () => {
    switch (currentTab) {
      case "overview":
        return { title: "Vue d'Ensemble & KPIs Globaux", subtitle: "Supervision globale du réseau, du séquestre et des alertes d'arbitrage." };
      case "disputes":
        return { title: "⚖️ Médiation & Arbitrage des Litiges (Art. 20)", subtitle: "Instruction contradictoire et rendu de décision d'arbitrage motivé sous 48h." };
      case "vendors":
        return { title: "🛡️ Santé des Boutiques Maâlems (Art. 6.4 & 22)", subtitle: "Gestion des compteurs d'avertissements mensuels et des suspensions." };
      case "escrow":
        return { title: "💰 Séquestre Financier & Retraits (Art. 14 bis)", subtitle: "Grand livre comptable et validation des virements bancaires sur RIB." };
      case "logistics":
        return { title: "🚚 Supervision Logistique Sendit & Directe", subtitle: "Suivi des colis, gestion des clients injoignables et preuves d'émargement." };
      case "cron":
        return { title: "⏰ Monitoring du Moteur de Cron Jobs CGV", subtitle: "Supervision en direct et déclenchement manuel des automatisations réglementaires." };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Sidebar Component */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        openDisputesCount={openDisputesCount}
        warningsCount={warnedVendorsCount}
      />

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header Component */}
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={loadAllData}
          loading={loading}
        />

        {/* View Content */}
        <main style={{ flex: 1, padding: 28, marginLeft: 260 }}>
          {currentTab === "overview" && (
            <OverviewView
              stats={stats}
              disputes={disputes}
              vendors={vendorProfiles}
              onNavigateTab={setCurrentTab}
              onOpenDispute={setActiveDisputeModal}
            />
          )}

          {currentTab === "disputes" && (
            <DisputesView
              disputes={disputes}
              onOpenWorkbench={setActiveDisputeModal}
            />
          )}

          {currentTab === "vendors" && (
            <VendorsView
              profiles={vendorProfiles}
              warnings={vendorWarnings}
              onIssueWarning={handleIssueWarning}
              onUpdateStatus={handleUpdateVendorStatus}
            />
          )}

          {currentTab === "escrow" && (
            <EscrowLedgerView
              withdrawals={withdrawals}
              ledger={ledger}
              onProcessWithdrawal={handleProcessWithdrawal}
            />
          )}

          {currentTab === "logistics" && (
            <LogisticsView orders={logisticsOrders} />
          )}

          {currentTab === "cron" && (
            <CronMonitorView
              executions={cronExecutions}
              onTriggerCron={handleTriggerCron}
            />
          )}
        </main>
      </div>

      {/* Active Dispute Workbench Modal */}
      {activeDisputeModal && (
        <DisputeWorkbenchModal
          dispute={activeDisputeModal}
          onClose={() => setActiveDisputeModal(null)}
          onResolve={handleResolveDispute}
        />
      )}
    </div>
  );
};
