import React from "react";
import { format } from "date-fns";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { useAppState } from "@/hooks/useAppState";
import { formatCurrency } from "@/lib/investigationEngine";

export default function TransactionTimeline() {
  const { analytics } = useAppState();
  const transactions = analytics.transactions || [];

  const getAccountName = (accountNumber) => {
    const account = analytics.accountsByNumber?.[accountNumber];
    return account?.account_holder_name || accountNumber;
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
      {transactions.map((transaction) => (
        <div
          key={transaction.transaction_id}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
            transaction.is_suspicious
              ? "bg-red-50 border-red-200 hover:border-red-300"
              : "bg-card border-border hover:border-border/80"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              transaction.is_suspicious ? "bg-red-100" : "bg-green-100"
            }`}
          >
            {transaction.is_suspicious ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Check className="w-3.5 h-3.5 text-green-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium truncate">{getAccountName(transaction.sender_account)}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{getAccountName(transaction.receiver_account)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {transaction.flag_reason || transaction.transaction_type || "Imported transaction"}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold">{formatCurrency(transaction.amount)}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(new Date(transaction.timestamp), "HH:mm:ss")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
