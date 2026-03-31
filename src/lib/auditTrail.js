import { jsPDF } from "jspdf";

// Audit trail system for legal compliance and investigator accountability
// Logs all investigative actions with timestamp, actor, action type, and impact

const auditLogs = [];
let currentInvestigator = "SI Cyber Cell";
const auditPersistenceListeners = new Set();

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatCurrency(value, fallback = "Rs 0") {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? fallback : `Rs ${numericValue.toLocaleString()}`;
}

/**
 * Initialize audit trail with a specific investigator
 */
export function setCurrentInvestigator(name) {
  currentInvestigator = name;
}

/**
 * Get current investigator
 */
export function getCurrentInvestigator() {
  return currentInvestigator;
}

/**
 * Log an action to the audit trail
 */
export function logAuditAction(actionType, actionDetails = {}, reason = "") {
  const auditEntry = {
    id: auditLogs.length + 1,
    timestamp: new Date().toISOString(),
    investigator: currentInvestigator,
    actionType,
    actionDetails,
    reason,
    systemInfo: {
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "N/A",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  auditLogs.push(auditEntry);

  try {
    const stored = localStorage.getItem("atp_audit_logs");
    const existing = stored ? JSON.parse(stored) : [];
    existing.push(auditEntry);

    if (existing.length > 5000) {
      existing.shift();
    }

    localStorage.setItem("atp_audit_logs", JSON.stringify(existing));
  } catch (error) {
    console.warn("Could not persist audit log:", error);
  }

  auditPersistenceListeners.forEach((listener) => {
    try {
      listener(auditEntry);
    } catch (error) {
      console.warn("Audit listener failed:", error);
    }
  });

  return auditEntry;
}

/**
 * Get all audit logs
 */
export function getAuditLogs() {
  return [...auditLogs];
}

export function replaceAuditLogs(nextLogs = []) {
  auditLogs.length = 0;
  auditLogs.push(...nextLogs);

  try {
    localStorage.setItem("atp_audit_logs", JSON.stringify(auditLogs));
  } catch (error) {
    console.warn("Could not persist replaced audit logs:", error);
  }
}

export function setAuditPersistenceListener(listener) {
  auditPersistenceListeners.add(listener);
  return () => auditPersistenceListeners.delete(listener);
}

/**
 * Get logs filtered by criteria
 */
export function getAuditLogsByFilter({
  startDate = null,
  endDate = null,
  investigator = null,
  actionType = null,
  accountNumber = null,
} = {}) {
  return auditLogs.filter((log) => {
    if (startDate && new Date(log.timestamp) < new Date(startDate)) return false;
    if (endDate && new Date(log.timestamp) > new Date(endDate)) return false;
    if (investigator && log.investigator !== investigator) return false;
    if (actionType && log.actionType !== actionType) return false;
    if (
      accountNumber &&
      !log.actionDetails.accountNumber?.includes(accountNumber)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Get summary statistics
 */
export function getAuditSummary() {
  const summary = {
    totalActions: auditLogs.length,
    investigatorStats: {},
    actionTypeStats: {},
    dateRange: null,
  };

  auditLogs.forEach((log) => {
    if (!summary.investigatorStats[log.investigator]) {
      summary.investigatorStats[log.investigator] = 0;
    }
    summary.investigatorStats[log.investigator] += 1;

    if (!summary.actionTypeStats[log.actionType]) {
      summary.actionTypeStats[log.actionType] = 0;
    }
    summary.actionTypeStats[log.actionType] += 1;
  });

  if (auditLogs.length > 0) {
    summary.dateRange = {
      start: auditLogs[0].timestamp,
      end: auditLogs[auditLogs.length - 1].timestamp,
    };
  }

  return summary;
}

/**
 * Export audit logs as CSV
 */
export function exportAuditLogsCSV(filteredLogs = null) {
  const logs = filteredLogs || auditLogs;

  const headers = [
    "Log ID",
    "Timestamp",
    "Investigator",
    "Action Type",
    "Account/Details",
    "Reason",
    "Amount Impact",
    "Status",
  ];

  const rows = logs.map((log) => [
    log.id,
    new Date(log.timestamp).toLocaleString(),
    log.investigator,
    log.actionType,
    formatActionDetails(log.actionDetails),
    log.reason || "N/A",
    getAmountImpact(log),
    log.actionDetails.status || "completed",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell || "");
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(",")
    ),
  ].join("\n");

  downloadCSV(
    csvContent,
    `ATP_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`
  );
}

/**
 * Export audit logs as PDF report
 */
export function exportAuditLogsPDF(filteredLogs = null) {
  const logs = filteredLogs || auditLogs;

  const doc = new jsPDF("p", "mm", "a4");
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const margin = 15;
  const lineHeight = 6;

  doc.setFontSize(16);
  doc.setTextColor(26, 35, 126);
  doc.text("AUDIT TRAIL REPORT", margin, yPosition);
  yPosition += 12;

  doc.setFontSize(9);
  doc.setTextColor(32, 32, 32);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(`Total Actions Logged: ${logs.length}`, margin, yPosition);
  yPosition += lineHeight;
  doc.text(
    `Date Range: ${logs.length > 0 ? new Date(logs[0].timestamp).toDateString() : "N/A"}`,
    margin,
    yPosition
  );
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(79, 89, 213);
  doc.text("ACTION LOG", margin, yPosition);
  yPosition += 8;

  doc.setFontSize(8);
  doc.setTextColor(32, 32, 32);

  logs.forEach((log) => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont(undefined, "bold");
    doc.text(`${log.actionType.toUpperCase()}`, margin, yPosition);
    yPosition += lineHeight;

    doc.setFont(undefined, "normal");
    doc.text(`Investigator: ${log.investigator}`, margin + 5, yPosition);
    yPosition += lineHeight - 1;

    doc.text(`Time: ${new Date(log.timestamp).toLocaleString()}`, margin + 5, yPosition);
    yPosition += lineHeight - 1;

    if (log.reason) {
      doc.text(`Reason: ${log.reason}`, margin + 5, yPosition);
      yPosition += lineHeight - 1;
    }

    const details = formatActionDetails(log.actionDetails);
    if (details) {
      doc.text(`Details: ${details}`, margin + 5, yPosition);
      yPosition += lineHeight - 1;
    }

    yPosition += 2;
  });

  doc.save(`ATP_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Format action details for display
 */
function formatActionDetails(details) {
  if (!details) return "";

  const parts = [];

  if (details.accountNumber) parts.push(`Account: ${details.accountNumber}`);
  if (details.accountName) parts.push(`Name: ${details.accountName}`);
  if (details.bank) parts.push(`Bank: ${details.bank}`);
  if (details.fileName) parts.push(`File: ${details.fileName}`);
  if (details.fileCount) parts.push(`Files: ${details.fileCount}`);
  if (details.transactionsCount) parts.push(`Transactions: ${details.transactionsCount}`);
  if (details.errorsCount) parts.push(`Errors: ${details.errorsCount}`);
  if (details.accountCount) parts.push(`Accounts: ${details.accountCount}`);
  if (details.accountNumbers?.length) parts.push(`Account List: ${details.accountNumbers.join(" | ")}`);
  if (details.banks?.length) parts.push(`Banks: ${details.banks.join(" | ")}`);
  if (details.amount !== undefined && details.amount !== null) {
    parts.push(`Amount: ${formatCurrency(details.amount)}`);
  }
  if (details.amountReleased !== undefined && details.amountReleased !== null) {
    parts.push(`Released: ${formatCurrency(details.amountReleased)}`);
  }
  if (details.totalReleasedSoFar !== undefined && details.totalReleasedSoFar !== null) {
    parts.push(`Total Released: ${formatCurrency(details.totalReleasedSoFar)}`);
  }
  if (details.newStatus) {
    parts.push(`Status: ${details.previousStatus} -> ${details.newStatus}`);
  }
  if (details.verificationStatus) parts.push(`Verification: ${details.verificationStatus}`);
  if (details.previousClassification) parts.push(`From: ${details.previousClassification}`);
  if (details.newClassification) parts.push(`To: ${details.newClassification}`);
  if (details.verificationDocs) parts.push(`Docs uploaded: ${details.verificationDocs}`);
  if (details.documentsCount) parts.push(`Documents: ${details.documentsCount}`);
  if (details.documentNames?.length) parts.push(`File Names: ${details.documentNames.join(" | ")}`);

  return parts.join(" | ");
}

/**
 * Get amount impact of an action
 */
function getAmountImpact(log) {
  switch (log.actionType) {
    case "freeze_account":
    case "batch_freeze":
      return `Frozen: ${formatCurrency(log.actionDetails.amount)}`;
    case "release_amount":
      return `Released: ${formatCurrency(log.actionDetails.amountReleased ?? log.actionDetails.amount)}`;
    case "unfreeze_account":
      return `Unfrozen: ${formatCurrency(log.actionDetails.amount)}`;
    default:
      return "N/A";
  }
}

/**
 * Helper: Download CSV
 */
function downloadCSV(csvContent, fileName) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Restore audit logs from localStorage on startup
 */
export function restoreAuditLogsFromStorage() {
  try {
    const stored = localStorage.getItem("atp_audit_logs");
    if (stored) {
      const restored = JSON.parse(stored);
      auditLogs.length = 0;
      auditLogs.push(...restored);
      return auditLogs.length;
    }
  } catch (error) {
    console.warn("Could not restore audit logs:", error);
  }
  return 0;
}

/**
 * Clear all audit logs (admin only)
 */
export function clearAuditLogs(confirmPassword = "") {
  if (confirmPassword !== "CLEAR_AUDIT_LOGS") {
    throw new Error("Invalid confirmation");
  }

  auditLogs.length = 0;
  localStorage.removeItem("atp_audit_logs");
  return true;
}

/**
 * Action type constants for consistency
 */
export const AUDIT_ACTION_TYPES = {
  IMPORT_CSV: "import_csv",
  FREEZE_ACCOUNT: "freeze_account",
  BATCH_FREEZE: "batch_freeze",
  UNFREEZE_ACCOUNT: "unfreeze_account",
  RELEASE_AMOUNT: "release_amount",
  VERIFY_ACCOUNT: "verify_account",
  UPDATE_CLASSIFICATION: "update_classification",
  UPLOAD_DOCUMENTS: "upload_documents",
  DOWNLOAD_REPORT: "download_report",
  DOWNLOAD_FREEZE_ORDER: "download_freeze_order",
  SEND_NOTIFICATION: "send_notification",
};
