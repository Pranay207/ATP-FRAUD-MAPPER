import {
  SAMPLE_ACCOUNTS,
  SAMPLE_CASE,
  SAMPLE_TRANSACTIONS,
} from "./sampleData";
import {
  buildCaseFromTransactions,
  buildInvestigationAnalytics,
  parseTransactionsCsv,
} from "./investigationEngine";
import {
  DEFAULT_IMPORTED_DATASET_FILES,
  DEFAULT_IMPORTED_DATASET_FILE,
} from "./defaultImportedDataset";
import { getFileExtension, getManagedFileCategory } from "./fileManagement";
import { generateImportNotifications } from "./notificationEngine";
import {
  logAuditAction,
  AUDIT_ACTION_TYPES,
  getAuditLogs,
  replaceAuditLogs,
  setAuditPersistenceListener,
} from "./auditTrail";
import {
  getPersistedSnapshot,
  savePersistedSnapshot,
} from "./persistentStore";

const listeners = new Set();

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const sampleAccounts = () => cloneValue(SAMPLE_ACCOUNTS);
const sampleTransactions = () => cloneValue(SAMPLE_TRANSACTIONS);
const sampleCase = () => cloneValue(SAMPLE_CASE);

let accounts = sampleAccounts();
let transactions = sampleTransactions();
let caseData = sampleCase();
let reviews = {};
let importMeta = {
  fileName: null,
  importedAt: null,
  importErrors: [],
  sourceFiles: [],
  origin: "demo",
};
let alerts = [];
let persistTimeoutId = null;
let snapshotCache = null;

function createPersistableSnapshot() {
  return cloneValue({
    accounts,
    transactions,
    caseData,
    reviews,
    importMeta,
    alerts,
    auditLogs: getAuditLogs(),
  });
}

async function persistCurrentState() {
  try {
    await savePersistedSnapshot(createPersistableSnapshot());
  } catch (error) {
    console.warn("Could not persist investigation state:", error);
  }
}

function schedulePersistState() {
  if (typeof window === "undefined") {
    return;
  }

  if (persistTimeoutId) {
    clearTimeout(persistTimeoutId);
  }

  persistTimeoutId = window.setTimeout(() => {
    persistTimeoutId = null;
    void persistCurrentState();
  }, 250);
}

function notify() {
  snapshotCache = null;
  schedulePersistState();
  listeners.forEach((fn) => fn());
}

function getAnalytics() {
  return buildInvestigationAnalytics({
    accounts,
    transactions,
    caseData,
    reviews,
  });
}

function syncCaseData() {
  const analytics = getAnalytics();
  caseData = {
    ...caseData,
    victim_account: analytics.victimAccount || caseData.victim_account,
    fraud_amount: analytics.rootAmount || caseData.fraud_amount,
    total_accounts_involved: analytics.accounts.length,
    frozen_accounts_count: analytics.accounts.filter((account) => account.account_status === "frozen").length,
    released_to_innocent_recipients: analytics.recoveryMetrics.releasedToInnocentRecipients,
  };

  return analytics;
}

function resetGeneratedAlerts() {
  const analytics = syncCaseData();
  alerts = analytics.generatedAlerts.map((alert) => ({
    ...alert,
    is_read: false,
    action_taken: "none",
  }));
  return analytics;
}

function ensureReviewEntry(accountNumber) {
  if (!reviews[accountNumber]) {
    reviews[accountNumber] = {
      documents: [],
      verified: false,
      releasedAmount: 0,
    };
  }

  return reviews[accountNumber];
}

function deriveCaseId(parsedTransactions = []) {
  const counts = new Map();

  parsedTransactions.forEach((transaction) => {
    const caseId = String(transaction.case_id || "").trim();
    if (!caseId) {
      return;
    }
    counts.set(caseId, (counts.get(caseId) || 0) + 1);
  });

  const dominantCase = [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
  return dominantCase || `ATP-CSV-${new Date().toISOString().slice(0, 10)}`;
}

function getAccountNodeType(accountNumber = "") {
  if (accountNumber.startsWith("CASE-")) {
    return "case_root";
  }
  if (accountNumber.startsWith("ATM-")) {
    return "atm";
  }
  if (accountNumber.startsWith("MICRO-")) {
    return "micro";
  }
  return "account";
}

function createIntegratedRootTransactions(parsedTransactions, caseId) {
  const normalizedTransactions = [...parsedTransactions]
    .map((transaction) => ({
      ...transaction,
      case_id: transaction.case_id || caseId,
    }))
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  const senderAccounts = new Set(normalizedTransactions.map((transaction) => transaction.sender_account));
  const receiverAccounts = new Set(normalizedTransactions.map((transaction) => transaction.receiver_account));
  const rootCandidates = [...senderAccounts].filter(
    (accountNumber) =>
      !receiverAccounts.has(accountNumber) &&
      !accountNumber.startsWith(`CASE-${caseId}-MASTER-ROOT`)
  );

  if (!rootCandidates.length) {
    return normalizedTransactions;
  }

  const rootAccount = `CASE-${caseId}-MASTER-ROOT`;
  const syntheticTransactions = rootCandidates.map((accountNumber, index) => {
    const outgoingTransactions = normalizedTransactions.filter(
      (transaction) => transaction.sender_account === accountNumber
    );
    const firstOutgoingTransaction = outgoingTransactions[0];
    const branchAmount = outgoingTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );
    const branchTimestamp = firstOutgoingTransaction?.timestamp
      ? new Date(new Date(firstOutgoingTransaction.timestamp).getTime() - (index + 1) * 60 * 1000).toISOString()
      : new Date().toISOString();

    return {
      transaction_id: `ROOT-${String(index + 1).padStart(3, "0")}`,
      sender_account: rootAccount,
      receiver_account: accountNumber,
      amount: branchAmount,
      timestamp: branchTimestamp,
      transaction_type: "case_entry",
      transaction_status: "success",
      reference_id: `ROOT-LINK-${index + 1}`,
      case_id: caseId,
      flag_reason: "Integrated branch created from uploaded bank-action datasets.",
      is_suspicious: true,
      sender_name: "Integrated Complaint Source",
      receiver_name: accountNumber,
      sender_bank: "AP Cyber Crime Cell",
      receiver_bank: firstOutgoingTransaction?.sender_bank || "Investigative Branch",
      sender_device: "",
      receiver_device: "",
      sender_ip: "",
      receiver_ip: "",
      sender_location: "Anantapur Cyber Cell",
      receiver_location: firstOutgoingTransaction?.sender_location || "",
      disputed_amount: branchAmount,
      bank_action: "Integrated case branch",
      action_date: branchTimestamp,
      layer: "ROOT",
      receiver_ifsc: "",
      pis_nodal: "",
    };
  });

  return [...syntheticTransactions, ...normalizedTransactions].sort(
    (left, right) => new Date(left.timestamp) - new Date(right.timestamp)
  );
}

function initializeState() {
  accounts = sampleAccounts();
  transactions = sampleTransactions();
  caseData = sampleCase();
  reviews = {};
  importMeta = {
    fileName: null,
    importedAt: null,
    importErrors: [],
    sourceFiles: [],
    origin: "demo",
  };
  if (!applyImportedCsvBundle(DEFAULT_IMPORTED_DATASET_FILES, DEFAULT_IMPORTED_DATASET_FILE, false)) {
    resetGeneratedAlerts();
  }
  snapshotCache = null;
}

initializeState();

setAuditPersistenceListener(() => {
  schedulePersistState();
});

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getAppSnapshot = () => {
  if (snapshotCache) {
    return snapshotCache;
  }

  const analytics = syncCaseData();
  snapshotCache = {
    accounts: analytics.accounts,
    alerts,
    caseData,
    transactions: analytics.transactions,
    reviews,
    analytics,
    importMeta,
  };

  return snapshotCache;
};

export const getAccounts = () => getAppSnapshot().accounts;
export const getAlerts = () => getAppSnapshot().alerts;
export const getCase = () => getAppSnapshot().caseData;
export const getTransactions = () => getAppSnapshot().transactions;

export const resetDemoData = () => {
  initializeState();
  notify();
};

function applyPersistedSnapshot(snapshot = {}) {
  accounts = Array.isArray(snapshot.accounts) ? cloneValue(snapshot.accounts) : sampleAccounts();
  transactions = Array.isArray(snapshot.transactions)
    ? cloneValue(snapshot.transactions)
    : sampleTransactions();
  caseData =
    snapshot.caseData && typeof snapshot.caseData === "object"
      ? cloneValue(snapshot.caseData)
      : sampleCase();
  reviews =
    snapshot.reviews && typeof snapshot.reviews === "object"
      ? cloneValue(snapshot.reviews)
      : {};
  importMeta = {
    fileName: null,
    importedAt: null,
    importErrors: [],
    sourceFiles: [],
    origin: "demo",
    ...(snapshot.importMeta && typeof snapshot.importMeta === "object"
      ? cloneValue(snapshot.importMeta)
      : {}),
  };
  alerts = Array.isArray(snapshot.alerts) ? cloneValue(snapshot.alerts) : [];
  replaceAuditLogs(Array.isArray(snapshot.auditLogs) ? cloneValue(snapshot.auditLogs) : []);
  syncCaseData();
  snapshotCache = null;
}

export async function hydratePersistedAppState() {
  try {
    const persistedSnapshot = await getPersistedSnapshot();
    if (!persistedSnapshot) {
      return false;
    }

    applyPersistedSnapshot(persistedSnapshot);
    notify();
    return true;
  } catch (error) {
    console.warn("Could not hydrate persisted investigation state:", error);
    return false;
  }
}

function applyImportedCsv(csvText, fileName = "uploaded.csv", markImported = true) {
  const { transactions: parsedTransactions, errors } = parseTransactionsCsv(csvText);
  return applyImportedTransactions(parsedTransactions, fileName, markImported, errors, [fileName]);
}

function applyImportedCsvBundle(datasetFiles = [], fileName, markImported = true) {
  const combinedTransactions = [];
  const combinedErrors = [];

  datasetFiles.forEach((dataset) => {
    const { transactions: parsedTransactions, errors } = parseTransactionsCsv(dataset.csvText);
    combinedTransactions.push(...parsedTransactions);
    combinedErrors.push(
      ...errors.map((error) => `${dataset.fileName}: ${error}`)
    );
  });

  if (!combinedTransactions.length) {
    return false;
  }

  const caseId = deriveCaseId(combinedTransactions);
  const integratedTransactions = createIntegratedRootTransactions(
    combinedTransactions,
    caseId
  );

  return applyImportedTransactions(
    integratedTransactions,
    fileName,
    markImported,
    combinedErrors,
    datasetFiles.map((dataset) => dataset.fileName)
  );
}

function applyImportedTransactions(
  parsedTransactions,
  fileName,
  markImported = true,
  importErrors = [],
  sourceFiles = []
) {
  if (!parsedTransactions.length) {
    return false;
  }

  const sampleLookup = new Map(sampleAccounts().map((account) => [account.account_number, account]));
  const accountSet = new Set();
  const derivedCaseId = deriveCaseId(parsedTransactions);

  parsedTransactions.forEach((transaction) => {
    accountSet.add(transaction.sender_account);
    accountSet.add(transaction.receiver_account);
  });

  accounts = Array.from(accountSet).map((accountNumber) => {
    const sampleAccount = sampleLookup.get(accountNumber) || {};
    const senderTransaction = parsedTransactions.find((transaction) => transaction.sender_account === accountNumber);
    const receiverTransaction = parsedTransactions.find((transaction) => transaction.receiver_account === accountNumber);
    const incomingTransactions = parsedTransactions.filter((transaction) => transaction.receiver_account === accountNumber);
    const outgoingTransactions = parsedTransactions.filter((transaction) => transaction.sender_account === accountNumber);
    const nodeType = getAccountNodeType(accountNumber);
    const estimatedIncoming = incomingTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.disputed_amount || transaction.amount || 0),
      0
    );
    const estimatedOutgoing = outgoingTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount || 0),
      0
    );
    const estimatedBalance = Math.max(
      sampleAccount.current_balance || 0,
      estimatedIncoming - estimatedOutgoing,
      incomingTransactions.length ? estimatedIncoming : 0
    );
    const receiverBankName = receiverTransaction?.receiver_bank || receiverTransaction?.sender_bank || sampleAccount.bank_name || "Unknown Bank";
    const senderBankName = senderTransaction?.sender_bank || sampleAccount.bank_name || "Unknown Bank";
    const bankActionText = incomingTransactions
      .map((transaction) => String(transaction.bank_action || ""))
      .join(" ")
      .toLowerCase();
    const inferredBalance =
      nodeType === "case_root" || nodeType === "atm" || nodeType === "micro"
        ? 0
        : estimatedBalance;
    const inferredClassification =
      nodeType === "atm"
        ? "cashout"
        : nodeType === "case_root"
          ? "victim"
          : sampleAccount.classification || "unknown";
    const inferredStatus =
      nodeType === "atm"
        ? "withdrawn"
        : bankActionText.includes("frozen") || bankActionText.includes("held")
          ? "frozen"
          : sampleAccount.account_status || "active";

    return {
      account_number: accountNumber,
      account_holder_name:
        senderTransaction?.sender_name ||
        receiverTransaction?.receiver_name ||
        sampleAccount.account_holder_name ||
        accountNumber,
      mobile_number: sampleAccount.mobile_number || "",
      email: sampleAccount.email || "",
      kyc_id_masked: sampleAccount.kyc_id_masked || "NA",
      bank_name:
        incomingTransactions.length ? receiverBankName : senderBankName,
      account_creation_date: sampleAccount.account_creation_date || "2024-01-01",
      current_balance: inferredBalance,
      account_status: inferredStatus,
      classification: inferredClassification,
      risk_score: 0,
      trust_score: 0,
      transaction_velocity: 0,
      chain_depth_level: 0,
      freeze_priority: 0,
      case_id: derivedCaseId,
      ip_address:
        senderTransaction?.sender_ip ||
        receiverTransaction?.receiver_ip ||
        sampleAccount.ip_address ||
        "",
      device_id:
        senderTransaction?.sender_device ||
        receiverTransaction?.receiver_device ||
        sampleAccount.device_id ||
        "",
      location:
        senderTransaction?.sender_location ||
        receiverTransaction?.receiver_location ||
        sampleAccount.location ||
        "Unknown",
      login_timestamp: senderTransaction?.timestamp || receiverTransaction?.timestamp || null,
    };
  });

  transactions = parsedTransactions.map((transaction) => ({
    ...transaction,
    case_id: transaction.case_id || derivedCaseId,
  }));
  caseData = buildCaseFromTransactions(sampleCase(), accounts, transactions);
  reviews = {};
  importMeta = {
    fileName,
    importedAt: markImported ? new Date().toISOString() : null,
    importErrors,
    sourceFiles,
    origin: markImported ? "uploaded" : "bundled",
  };
  resetGeneratedAlerts();

  return {
    importedTransactions: parsedTransactions.length,
    importErrors,
  };
}

export const importTransactionsFromCsv = (csvText, fileName = "uploaded.csv") => {
  const result = applyImportedCsv(csvText, fileName, true);

  if (!result) {
    throw new Error("No valid transactions were found in the uploaded CSV.");
  }

  notify();
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.IMPORT_CSV,
      {
        fileName,
        transactionsCount: result.importedTransactions,
        errorsCount: result.importErrors.length,
        sourceFiles: [fileName],
      },
      `Imported CSV file with ${result.importedTransactions} transactions`
    );
  } catch (error) {
    console.warn("Could not log import action:", error);
  }
  
  // Generate real-time notifications about fraud patterns
  try {
    const analytics = getAnalytics();
    generateImportNotifications(analytics);
  } catch (error) {
    console.warn("Could not generate notifications:", error);
  }
  
  return result;
};

export const importTransactionsFromCsvBundle = (
  datasetFiles = [],
  fileName = "uploaded-bundle.csv"
) => {
  const result = applyImportedCsvBundle(datasetFiles, fileName, true);

  if (!result) {
    throw new Error("No valid transactions were found in the uploaded CSV bundle.");
  }

  notify();
  
  // Log to audit trail
  try {
    const sourceFileNames = datasetFiles.map((df) => df.fileName);
    logAuditAction(
      AUDIT_ACTION_TYPES.IMPORT_CSV,
      {
        fileName,
        fileCount: datasetFiles.length,
        transactionsCount: result.importedTransactions,
        errorsCount: result.importErrors.length,
        sourceFiles: sourceFileNames,
      },
      `Imported CSV bundle with ${datasetFiles.length} files and ${result.importedTransactions} transactions`
    );
  } catch (error) {
    console.warn("Could not log import action:", error);
  }
  
  // Generate real-time notifications about fraud patterns
  try {
    const analytics = getAnalytics();
    generateImportNotifications(analytics);
  } catch (error) {
    console.warn("Could not generate notifications:", error);
  }
  
  return result;
};

export const freezeAccount = (accountNumber) => {
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  
  accounts = accounts.map((account) =>
    account.account_number === accountNumber
      ? { ...account, account_status: "frozen" }
      : account
  );

  alerts = alerts.map((alert) =>
    alert.account_number === accountNumber && alert.action_taken === "none"
      ? { ...alert, action_taken: "frozen", is_read: true }
      : alert
  );

  syncCaseData();
  notify();
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.FREEZE_ACCOUNT,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        amount: getAuditAccountAmount(auditAccount || account),
        bank: auditAccount?.bank_name || account?.bank_name || "Unknown",
      },
      auditAccount?.classification || account?.classification || ""
    );
  } catch (error) {
    console.warn("Could not log freeze action:", error);
  }
  
  // Trigger notification
  try {
    const { notifyAccountFrozen } = require("./notificationEngine");
    if (account) {
      notifyAccountFrozen(account);
    }
  } catch (error) {
    console.warn("Could not trigger freeze notification:", error);
  }
};

export const unfreezeAccount = (accountNumber) => {
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  
  accounts = accounts.map((account) =>
    account.account_number === accountNumber
      ? { ...account, account_status: "active" }
      : account
  );
  
  syncCaseData();
  notify();
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.UNFREEZE_ACCOUNT,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        amount: getAuditAccountAmount(auditAccount || account),
        bank: auditAccount?.bank_name || account?.bank_name || "Unknown",
      },
      "Account unfrozen"
    );
  } catch (error) {
    console.warn("Could not log unfreeze action:", error);
  }
};

export const batchFreezeAccounts = (accountNumbers = []) => {
  if (!accountNumbers.length) {
    throw new Error("No accounts selected for batch freeze");
  }

  const frozenAccounts = [];

  accounts = accounts.map((account) => {
    if (accountNumbers.includes(account.account_number)) {
      frozenAccounts.push(account);
      return { ...account, account_status: "frozen" };
    }
    return account;
  });

  alerts = alerts.map((alert) =>
    accountNumbers.includes(alert.account_number) && alert.action_taken === "none"
      ? { ...alert, action_taken: "frozen", is_read: true }
      : alert
  );

  syncCaseData();
  notify();
  const auditAccounts = accountNumbers
    .map((accountNumber) => getAuditAccountSnapshot(accountNumber))
    .filter(Boolean);

  // Log to audit trail
  try {
    const totalAmount = auditAccounts.reduce(
      (sum, acc) => sum + getAuditAccountAmount(acc),
      0
    );
    const bankSet = new Set(auditAccounts.map((acc) => acc.bank_name).filter(Boolean));
    const highRiskCount = auditAccounts.filter((acc) => (acc.risk_score || 0) > 7).length;
    
    logAuditAction(
      AUDIT_ACTION_TYPES.BATCH_FREEZE,
      {
        accountCount: accountNumbers.length,
        accountNumbers,
        amount: totalAmount,
        bankCount: bankSet.size,
        banks: Array.from(bankSet),
        highRiskCount,
      },
      `Batch freeze operation: ${accountNumbers.length} accounts`
    );
  } catch (error) {
    console.warn("Could not log batch freeze action:", error);
  }

  // Trigger notifications for batch freeze
  try {
    const { notifyAccountFrozen } = require("./notificationEngine");
    (auditAccounts.length ? auditAccounts : frozenAccounts).forEach((account) => {
      notifyAccountFrozen(account);
    });
    
    // Trigger batch notification
    const { triggerNotification } = require("./notificationEngine");
    triggerNotification("BATCH_FREEZE_COMPLETED", {
      accountCount: accountNumbers.length,
      totalAmount: auditAccounts.reduce((sum, acc) => sum + getAuditAccountAmount(acc), 0),
      bankCount: new Set(auditAccounts.map((acc) => acc.bank_name).filter(Boolean)).size,
    });
  } catch (error) {
    console.warn("Could not trigger batch freeze notification:", error);
  }

  return {
    frozenCount: accountNumbers.length,
    frozenAccounts,
  };
};

export const updateAlertAction = (idx, action) => {
  alerts = alerts.map((alert, index) =>
    index === idx ? { ...alert, action_taken: action, is_read: true } : alert
  );

  if (action === "frozen") {
    const alert = alerts[idx];
    if (alert?.account_number) {
      freezeAccount(alert.account_number);
      return;
    }
  }

  notify();
};

export const markAlertRead = (idx) => {
  alerts = alerts.map((alert, index) =>
    index === idx ? { ...alert, is_read: true } : alert
  );
  notify();
};

export const markAllAlertsRead = () => {
  alerts = alerts.map((alert) => ({ ...alert, is_read: true }));
  notify();
};

export const updateAccountClassification = (accountNumber, classification) => {
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  const previousClassification = account?.classification || "unclassified";
  
  accounts = accounts.map((account) =>
    account.account_number === accountNumber
      ? { ...account, classification }
      : account
  );
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.UPDATE_CLASSIFICATION,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        previousClassification,
        newClassification: classification,
      },
      `Classification changed from ${previousClassification} to ${classification}`
    );
  } catch (error) {
    console.warn("Could not log classification update:", error);
  }
  
  notify();
};

export const addRecovery = (amount) => {
  caseData = {
    ...caseData,
    recovered_amount: Math.min(caseData.fraud_amount, caseData.recovered_amount + amount),
  };
  notify();
};

export const uploadSupportingDocuments = (accountNumber, files = []) => {
  const review = ensureReviewEntry(accountNumber);
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  
  const documents = Array.from(files).map((file) => ({
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
    extension: getFileExtension(file.name),
    category: getManagedFileCategory(file.name, file.type),
    uploadedAt: new Date().toISOString(),
  }));
  review.documents = [...review.documents, ...documents];
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.UPLOAD_DOCUMENTS,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        documentsCount: documents.length,
        documentNames: documents.map((doc) => doc.name),
        totalDocuments: review.documents.length,
      },
      `Uploaded ${documents.length} supporting document(s)`
    );
  } catch (error) {
    console.warn("Could not log document upload:", error);
  }
  
  notify();
};

export const verifyLegitimateAccount = (accountNumber, verified = true) => {
  const review = ensureReviewEntry(accountNumber);
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  
  review.verified = verified;
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.VERIFY_ACCOUNT,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        verificationStatus: verified ? "verified" : "unverified",
        documentsCount: review.documents.length,
      },
      verified ? "Account verified as legitimate" : "Account verification removed"
    );
  } catch (error) {
    console.warn("Could not log verification action:", error);
  }
  
  notify();
};

export const releaseDisputedAmount = (accountNumber, amount) => {
  const review = ensureReviewEntry(accountNumber);
  const account = accounts.find((acc) => acc.account_number === accountNumber);
  review.releasedAmount = Math.max(0, roundNumber(review.releasedAmount + amount));
  const auditAccount = getAuditAccountSnapshot(accountNumber);
  
  // Log to audit trail
  try {
    logAuditAction(
      AUDIT_ACTION_TYPES.RELEASE_AMOUNT,
      {
        accountNumber,
        accountName: getAuditAccountName(auditAccount || account),
        amountReleased: amount,
        totalReleasedSoFar: review.releasedAmount,
        status: "completed",
      },
      `Released Rs ${Number(amount || 0).toLocaleString()} to account`
    );
  } catch (error) {
    console.warn("Could not log release action:", error);
  }
  
  notify();
};

function roundNumber(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getAuditAccountSnapshot(accountNumber) {
  const analyticsAccount = getAnalytics().accounts.find(
    (account) => account.account_number === accountNumber
  );
  const baseAccount = accounts.find((account) => account.account_number === accountNumber);

  return analyticsAccount || baseAccount || null;
}

function getAuditAccountName(account) {
  return account?.account_holder_name || account?.account_name || "Unknown";
}

function getAuditAccountAmount(account) {
  const disputedAmount = Number(account?.disputed_amount);
  if (Number.isFinite(disputedAmount) && disputedAmount > 0) {
    return disputedAmount;
  }

  const currentBalance = Number(account?.current_balance);
  if (Number.isFinite(currentBalance) && currentBalance > 0) {
    return currentBalance;
  }

  return 0;
}
