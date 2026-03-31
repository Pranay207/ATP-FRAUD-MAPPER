import React, { useState } from "react";
import {
  CheckCircle2,
  FileDown,
  FileText,
  Shield,
  Snowflake,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { MANAGED_FILE_ACCEPT } from "@/lib/fileManagement";
import { formatCurrency } from "@/lib/investigationEngine";
import { downloadNotificationLetter, generateFreezePacketPdf } from "@/lib/reporting";
import {
  generateBatchFreezeOrder,
  generateBankNotifications,
  exportBatchFreezeCSV,
  getBatchFreezeStats,
} from "@/lib/batchFreezeEngine";
import { useAppState } from "@/hooks/useAppState";

function RecommendationBar({ label, value, total = 100, tone = "bg-blue-500" }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <Progress value={Math.min(total, value)} className={`h-2 flex-1 ${tone}`} />
        <span className="text-xs font-bold">{Math.round(value)}</span>
      </div>
    </div>
  );
}

export default function FreezePanel() {
  const {
    analytics,
    caseData,
    freezeAccount,
    batchFreezeAccounts,
    releaseDisputedAmount,
    unfreezeAccount,
    uploadSupportingDocuments,
    verifyLegitimateAccount,
  } = useAppState();
  const [confirming, setConfirming] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [isBatchFreezing, setIsBatchFreezing] = useState(false);

  const frozenCount = analytics.accounts.filter((account) => account.account_status === "frozen").length;
  const pendingFreeze = analytics.immediateFreeze.filter((account) => account.account_status !== "frozen").length;

  const handleFreeze = (account) => {
    if (confirming === account.account_number) {
      freezeAccount(account.account_number);
      setConfirming(null);
      return;
    }

    setConfirming(account.account_number);
  };

  const handleSelectAccount = (accountNumber) => {
    const newSelected = new Set(selectedAccounts);
    if (newSelected.has(accountNumber)) {
      newSelected.delete(accountNumber);
    } else {
      newSelected.add(accountNumber);
    }
    setSelectedAccounts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAccounts.size === analytics.immediateFreeze.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(
        new Set(analytics.immediateFreeze.filter((acc) => acc.account_status !== "frozen").map((acc) => acc.account_number))
      );
    }
  };

  const handleBatchFreeze = async () => {
    if (selectedAccounts.size === 0) {
      toast({
        variant: "destructive",
        title: "No accounts selected",
        description: "Select at least one account to freeze.",
      });
      return;
    }

    setIsBatchFreezing(true);

    try {
      // Execute batch freeze
      const result = batchFreezeAccounts(Array.from(selectedAccounts));

      toast({
        title: "✅ Batch Freeze Executed",
        description: `Successfully froze ${result.frozenCount} account(s)`,
      });

      setSelectedAccounts(new Set());
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Batch freeze failed",
        description: error.message,
      });
    } finally {
      setIsBatchFreezing(false);
    }
  };

  const handleGenerateFreezeOrder = async () => {
    if (selectedAccounts.size === 0) {
      toast({
        variant: "destructive",
        title: "No accounts selected",
        description: "Select at least one account to generate freeze order.",
      });
      return;
    }

    try {
      const selectedAccountsData = analytics.immediateFreeze.filter((acc) =>
        selectedAccounts.has(acc.account_number)
      );

      await generateBatchFreezeOrder(caseData, selectedAccountsData);

      toast({
        title: "📄 Freeze Order Generated",
        description: "PDF freeze order downloaded successfully. Print and submit to banks.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate order",
        description: error.message,
      });
    }
  };

  const handleExportBankNotifications = () => {
    if (selectedAccounts.size === 0) {
      toast({
        variant: "destructive",
        title: "No accounts selected",
        description: "Select at least one account.",
      });
      return;
    }

    try {
      const selectedAccountsData = analytics.immediateFreeze.filter((acc) =>
        selectedAccounts.has(acc.account_number)
      );

      const notifications = generateBankNotifications(caseData, selectedAccountsData);

      // Copy email details to clipboard for manual sending
      const emailText = notifications
        .map(
          (notif) => `To: ${notif.recipients.join(", ")}
Subject: ${notif.subject}

${notif.body}`
        )
        .join("\n\n" + "=".repeat(80) + "\n\n");

      navigator.clipboard.writeText(emailText);

      toast({
        title: "📧 Bank Notifications Copied",
        description: `Email templates for ${notifications.length} bank(s) copied to clipboard. Paste in your email client.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate notifications",
        description: error.message,
      });
    }
  };

  const handleExportFreezeCSV = () => {
    if (selectedAccounts.size === 0) {
      toast({
        variant: "destructive",
        title: "No accounts selected",
        description: "Select at least one account.",
      });
      return;
    }

    try {
      const selectedAccountsData = analytics.immediateFreeze.filter((acc) =>
        selectedAccounts.has(acc.account_number)
      );

      exportBatchFreezeCSV(caseData, selectedAccountsData);

      toast({
        title: "📊 CSV Exported",
        description: "Batch freeze CSV downloaded for import to banking systems.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    }
  };

  const batchStats = selectedAccounts.size > 0 ? getBatchFreezeStats(
    analytics.immediateFreeze.filter((acc) => selectedAccounts.has(acc.account_number))
  ) : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Freeze Recommendation & Review</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Rank high-risk accounts, protect likely innocent recipients, and generate the bank-ready packet.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-3 py-1.5 font-semibold">
            <Snowflake className="w-3.5 h-3.5 mr-1" /> {frozenCount} Frozen
          </Badge>
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-3 py-1.5 font-semibold">
            {pendingFreeze} Pending Immediate Freeze
          </Badge>
          <Button variant="outline" onClick={() => generateFreezePacketPdf(caseData, analytics)}>
            <FileDown className="w-4 h-4 mr-2" />
            Generate Freeze Packet PDF
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-800">Officer workflow</p>
          <p className="text-xs text-blue-700">
            1. Freeze high-risk accounts immediately. 2. Upload proofs for likely innocent accounts.
            3. Verify legitimacy. 4. Hold only the disputed layered amount and release the rest.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Immediate Freeze List
          </h2>
          <span className="text-xs text-muted-foreground">
            Ranked by risk score and disputed hold amount
          </span>
        </div>

        {/* Batch Freeze Controls */}
        {selectedAccounts.size > 0 && batchStats && (
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">
                    📋 {batchStats.totalAccounts} Account(s) Selected for Batch Freeze
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-blue-700 font-semibold">Total Freeze</p>
                      <p className="text-blue-900 font-bold">{formatCurrency(batchStats.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-semibold">Banks</p>
                      <p className="text-blue-900 font-bold">{batchStats.banksInvolved}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-semibold">High Risk</p>
                      <p className="text-blue-900 font-bold">{batchStats.highRiskCount}</p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-semibold">Avg Risk Score</p>
                      <p className="text-blue-900 font-bold">{batchStats.avgRiskScore}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 lg:w-96">
                  <Button
                    onClick={handleBatchFreeze}
                    disabled={isBatchFreezing}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold w-full"
                  >
                    <Snowflake className="w-4 h-4 mr-2" />
                    {isBatchFreezing ? "Freezing..." : "❄️ Freeze All Selected"}
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateFreezeOrder}
                      className="text-xs border-blue-400 text-blue-700"
                    >
                      <FileDown className="w-3 h-3 mr-1" />
                      Freeze Order PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportBankNotifications}
                      className="text-xs border-blue-400 text-blue-700"
                    >
                      📧 Email Templates
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportFreezeCSV}
                      className="text-xs border-blue-400 text-blue-700"
                    >
                      📊 Export CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAccounts(new Set())}
                      className="text-xs border-gray-300 text-gray-700"
                    >
                      ✕ Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Select All / Accounts Header */}
        {analytics.immediateFreeze.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
            <Checkbox
              checked={
                selectedAccounts.size > 0 &&
                selectedAccounts.size === analytics.immediateFreeze.filter((acc) => acc.account_status !== "frozen").length
              }
              onCheckedChange={handleSelectAll}
              className="w-5 h-5"
            />
            <span className="text-sm font-medium text-gray-700">
              {selectedAccounts.size > 0
                ? `${selectedAccounts.size} account(s) selected`
                : "Select accounts for batch freeze"}
            </span>
          </div>
        )}

        {/* Accounts List */}
        {analytics.immediateFreeze.map((account, index) => {
          const isFrozen = account.account_status === "frozen";
          const isConfirming = confirming === account.account_number;
          const isSelected = selectedAccounts.has(account.account_number);

          return (
            <Card
              key={account.account_number}
              className={`bg-white border-2 shadow-sm transition-all ${
                isSelected ? "bg-blue-50 border-blue-500" : isFrozen ? "border-blue-300" : isConfirming ? "border-red-400" : "border-border"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col xl:flex-row gap-5">
                  {/* Checkbox for batch selection */}
                  <div className="flex items-start">
                    <Checkbox
                      checked={isSelected}
                      disabled={isFrozen}
                      onCheckedChange={() => handleSelectAccount(account.account_number)}
                      className="w-5 h-5 mt-0.5"
                    />
                  </div>

                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold bg-red-50 text-red-700">
                    #{index + 1}
                  </div>

                  <div className="flex-1 min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-base">{account.account_holder_name}</p>
                      <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                        Risk {account.risk_score}
                      </Badge>
                      <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                        Hold {formatCurrency(account.disputed_amount)}
                      </Badge>
                      {isFrozen && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          <Snowflake className="w-3 h-3 mr-1" /> FROZEN
                        </Badge>
                      )}
                      {isSelected && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          ✓ Selected
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {account.bank_name} | {account.account_number} | Current balance {formatCurrency(account.current_balance)}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <RecommendationBar label="Freeze Priority" value={account.freeze_priority * 10} />
                      <RecommendationBar label="Velocity Risk" value={account.stats.high_velocity ? 85 : account.transaction_velocity * 12} />
                      <RecommendationBar label="Fragmentation Risk" value={account.stats.out_degree * 22 + (account.stats.rapid_split ? 20 : 0)} />
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                        Why this account is prioritized
                      </p>
                      <div className="space-y-1">
                        {account.explanation.map((line) => (
                          <p key={line} className="text-xs text-slate-700">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2 xl:w-48">

                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-1">
                        Why this account is prioritized
                      </p>
                      <div className="space-y-1">
                        {account.explanation.map((line) => (
                          <p key={line} className="text-xs text-slate-700">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2 xl:w-48">
                    {isFrozen ? (
                      <>
                        <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 bg-blue-50" disabled>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Frozen
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => unfreezeAccount(account.account_number)}>
                          Unfreeze
                        </Button>
                      </>
                    ) : isConfirming ? (
                      <>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleFreeze(account)}>
                          Yes, Freeze
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirming(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleFreeze(account)}>
                        <Snowflake className="w-4 h-4 mr-1" /> Freeze Now
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadNotificationLetter(caseData, account, account)}
                    >
                      <FileText className="w-4 h-4 mr-1" /> Notice (EN + TE)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Review / Partial Release List
          </h2>
          <span className="text-xs text-muted-foreground">
            Upload proofs, verify, then release only the safe portion
          </span>
        </div>

        {analytics.reviewAccounts.map((account) => (
          <Card key={account.account_number} className="bg-white border border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-col xl:flex-row gap-5">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-base">{account.account_holder_name}</p>
                    <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                      Legitimacy {account.trust_score}
                    </Badge>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                      Hold {formatCurrency(account.disputed_amount)}
                    </Badge>
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                      Release {formatCurrency(account.releaseable_amount)}
                    </Badge>
                    {account.is_verified_legitimate && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {account.bank_name} | {account.account_number} | {account.supporting_documents.length} uploaded document(s)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <RecommendationBar label="Legitimacy Score" value={account.trust_score} />
                    <RecommendationBar label="Risk Score" value={account.risk_score} />
                    <RecommendationBar label="Releaseable Balance %" value={account.current_balance ? (account.releaseable_amount / account.current_balance) * 100 : 0} />
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-800 mb-1">
                      Partial release recommendation
                    </p>
                    <p className="text-sm text-emerald-900">
                      Hold only <strong>{formatCurrency(account.disputed_amount)}</strong> and release{" "}
                      <strong>{formatCurrency(account.releaseable_amount)}</strong> once supporting documents are verified.
                    </p>
                  </div>
                </div>

                <div className="xl:w-64 flex flex-col gap-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      multiple
                      accept={MANAGED_FILE_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        uploadSupportingDocuments(account.account_number, event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                      <Upload className="w-4 h-4" />
                      Upload Documents
                    </span>
                  </label>

                  <p className="text-[11px] text-muted-foreground">
                    Supports PDF, Word, Excel, CSV, text, presentation, and image files.
                  </p>

                  <Button
                    variant={account.is_verified_legitimate ? "default" : "outline"}
                    size="sm"
                    onClick={() => verifyLegitimateAccount(account.account_number, !account.is_verified_legitimate)}
                  >
                    {account.is_verified_legitimate ? "Verified" : "Mark Verified"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadNotificationLetter(caseData, account, account)}
                  >
                    <FileText className="w-4 h-4 mr-1" />
                    Notice (EN + TE)
                  </Button>

                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!account.releaseable_amount || !account.is_verified_legitimate}
                    onClick={() => releaseDisputedAmount(account.account_number, account.releaseable_amount)}
                  >
                    Release Safe Balance
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
