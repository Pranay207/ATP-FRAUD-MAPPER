import { useSyncExternalStore } from "react";
import {
  addRecovery,
  freezeAccount,
  batchFreezeAccounts,
  getAppSnapshot,
  importTransactionsFromCsv,
  importTransactionsFromCsvBundle,
  markAlertRead,
  markAllAlertsRead,
  releaseDisputedAmount,
  resetDemoData,
  subscribe,
  unfreezeAccount,
  updateAccountClassification,
  updateAlertAction,
  uploadSupportingDocuments,
  verifyLegitimateAccount,
} from "@/lib/appState";
import {
  getAuditLogs,
  setCurrentInvestigator,
  getCurrentInvestigator,
  getAuditSummary,
  getAuditLogsByFilter,
} from "@/lib/auditTrail";

export function useAppState() {
  const snapshot = useSyncExternalStore(subscribe, getAppSnapshot, getAppSnapshot);

  return {
    ...snapshot,
    addRecovery,
    batchFreezeAccounts,
    freezeAccount,
    importTransactionsFromCsv,
    importTransactionsFromCsvBundle,
    markAlertRead,
    markAllAlertsRead,
    releaseDisputedAmount,
    resetDemoData,
    unfreezeAccount,
    updateAccountClassification,
    updateAlertAction,
    uploadSupportingDocuments,
    verifyLegitimateAccount,
    // Audit trail functions
    getAuditLogs,
    setCurrentInvestigator,
    getCurrentInvestigator,
    getAuditSummary,
    getAuditLogsByFilter,
  };
}
