// Notification system for real-time fraud alerts
import { toast } from "@/components/ui/use-toast";

const notificationListeners = new Set();

function toFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatCurrency(value, fallback = "Rs 0") {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? fallback : `Rs ${numericValue.toLocaleString()}`;
}

function formatAccountNumber(accountNumber, fallback = "Unknown account") {
  const normalized = String(accountNumber || "").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > 8 ? `${normalized.substring(0, 8)}...` : normalized;
}

export function subscribeToNotifications(callback) {
  notificationListeners.add(callback);
  return () => notificationListeners.delete(callback);
}

function broadcastNotification(notification) {
  notificationListeners.forEach((listener) => listener(notification));
}

/**
 * Triggers a real-time notification toast
 */
export function triggerNotification(type, data = {}) {
  const notifications = {
    HIGH_VELOCITY_DETECTED: {
      title: "High-Velocity Transaction Detected",
      description: `Account ${data.accountNumber} made ${data.count} transfers in ${data.timeframe}. Risk Score: ${data.riskScore}`,
      severity: "critical",
      color: "destructive",
    },
    LARGE_AMOUNT_MOVING: {
      title: "Large Amount Still Moving",
      description: `${formatCurrency(data.amount)} detected in ${data.accountCount ?? 0} unfrozen account(s). Immediate freeze recommended.`,
      severity: "critical",
      color: "destructive",
    },
    RAPID_SPLIT_DETECTED: {
      title: "Rapid Fund Split Pattern",
      description: `Account ${data.accountNumber} split incoming funds across ${data.recipientCount} accounts within 15 minutes. Splitter indicator.`,
      severity: "warning",
      color: "warning",
    },
    ACCOUNT_FROZEN: {
      title: "Account Frozen",
      description: `Account ${data.accountNumber} (${formatCurrency(data.amount)}) has been successfully frozen.`,
      severity: "success",
      color: "default",
    },
    ACCOUNT_RELEASED: {
      title: "Account Released",
      description: `Account ${data.accountNumber} verified as legitimate. ${formatCurrency(data.amount)} released to verified recipient.`,
      severity: "success",
      color: "default",
    },
    SUSPICIOUS_TRANSACTION: {
      title: "Suspicious Transaction Flagged",
      description: `Transaction ID ${data.transactionId}: ${data.reason}. Amount: ${formatCurrency(data.amount)}`,
      severity: "warning",
      color: "warning",
    },
    MONEY_PATH_TRACED: {
      title: "Money Path Traced",
      description: `Victim (${data.victimAccount}) -> ${data.pathLength} intermediate accounts -> Final recipient. Chain depth: ${data.chainDepth}`,
      severity: "info",
      color: "default",
    },
    IMPORT_STARTED: {
      title: "Importing CSV Data",
      description: `Processing ${data.transactionCount} transactions from ${data.fileName}...`,
      severity: "info",
      color: "default",
    },
    IMPORT_COMPLETED: {
      title: "Import Complete",
      description: `Successfully imported ${data.importedCount} transactions. Case ${data.caseId} updated with ${data.accountCount} accounts.`,
      severity: "success",
      color: "default",
    },
    IMPORT_ERROR: {
      title: "Import Error",
      description: `Failed to import: ${data.error}. Skipped ${data.skippedRows} invalid rows.`,
      severity: "error",
      color: "destructive",
    },
    BATCH_FREEZE_COMPLETED: {
      title: "Batch Freeze Completed",
      description: `Successfully froze ${data.accountCount} accounts across ${data.bankCount} bank(s). Total amount frozen: ${formatCurrency(data.totalAmount)}`,
      severity: "success",
      color: "default",
    },
  };

  const notification = notifications[type];
  if (!notification) {
    console.warn(`Unknown notification type: ${type}`);
    return;
  }

  toast({
    title: notification.title,
    description: notification.description,
    variant: notification.color,
  });

  broadcastNotification({
    type,
    ...notification,
    data,
    timestamp: new Date(),
  });
}

/**
 * Generate notifications based on analytics after import
 */
export function generateImportNotifications(analytics) {
  const accounts = Array.isArray(analytics?.accounts) ? analytics.accounts : [];
  const transactions = Array.isArray(analytics?.transactions) ? analytics.transactions : [];
  const recoveryMetrics = analytics?.recoveryMetrics || {};

  const highVelocityAccounts = accounts.filter(
    (acc) => acc.transaction_velocity >= 3 && acc.classification !== "victim"
  );

  highVelocityAccounts.slice(0, 2).forEach((account) => {
    triggerNotification("HIGH_VELOCITY_DETECTED", {
      accountNumber: formatAccountNumber(account.account_number),
      count: transactions.filter((tx) => tx.sender_account === account.account_number).length,
      timeframe: "1 hour",
      riskScore: account.risk_score ?? 0,
    });
  });

  const totalFraudAmount = toFiniteNumber(recoveryMetrics.totalFraudAmount) ?? 0;
  const amountStillMoving = toFiniteNumber(recoveryMetrics.amountStillMoving) ?? 0;
  if (amountStillMoving > totalFraudAmount * 0.3) {
    triggerNotification("LARGE_AMOUNT_MOVING", {
      amount: amountStillMoving,
      accountCount: accounts.filter((acc) => acc.account_status !== "frozen").length,
    });
  }

  const rapidSplitAccounts = accounts
    .filter((acc) => acc.classification === "splitter")
    .slice(0, 1);

  rapidSplitAccounts.forEach((account) => {
    const outgoingTxs = transactions.filter((tx) => tx.sender_account === account.account_number);
    triggerNotification("RAPID_SPLIT_DETECTED", {
      accountNumber: formatAccountNumber(account.account_number),
      recipientCount: new Set(outgoingTxs.map((tx) => tx.receiver_account)).size,
    });
  });

  if (accounts.length > 0 || analytics?.victimAccount) {
    triggerNotification("MONEY_PATH_TRACED", {
      victimAccount: formatAccountNumber(analytics?.victimAccount, "Case root"),
      pathLength: accounts.length,
      chainDepth: Math.max(0, ...accounts.map((acc) => acc.chain_depth_level || 0)),
    });
  }
}

/**
 * Notify when account is frozen
 */
export function notifyAccountFrozen(account) {
  triggerNotification("ACCOUNT_FROZEN", {
    accountNumber: formatAccountNumber(account?.account_number),
    amount: account?.current_balance,
  });
}

/**
 * Notify when account is released
 */
export function notifyAccountReleased(account, releasedAmount) {
  triggerNotification("ACCOUNT_RELEASED", {
    accountNumber: formatAccountNumber(account?.account_number),
    amount: releasedAmount,
  });
}
