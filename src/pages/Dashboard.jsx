import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Network,
  ShieldCheck,
  Snowflake,
  Upload,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";

import DatasetManagerDialog from "@/components/data/DatasetManagerDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";

export default function Dashboard() {
  const { alerts, analytics, caseData, importMeta, transactions } = useAppState();

  const { recoveryMetrics, immediateFreeze, reviewAccounts } = analytics;
  const unreadCriticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical" && !alert.is_read
  ).length;

  const statCards = [
    {
      label: "Total Fraud Amount",
      value: formatCurrency(recoveryMetrics.totalFraudAmount),
      sub: `Victim: ${caseData.victim_name}`,
      icon: IndianRupee,
      tone: "text-red-700",
      shell: "bg-red-50 border-red-200",
    },
    {
      label: "Amount Frozen",
      value: formatCurrency(recoveryMetrics.amountFrozen),
      sub: `${immediateFreeze.filter((account) => account.account_status === "frozen").length} accounts under hold`,
      icon: Snowflake,
      tone: "text-blue-700",
      shell: "bg-blue-50 border-blue-200",
    },
    {
      label: "Amount Still Moving",
      value: formatCurrency(recoveryMetrics.amountStillMoving),
      sub: "Requires immediate intervention",
      icon: Clock,
      tone: "text-orange-700",
      shell: "bg-orange-50 border-orange-200",
    },
    {
      label: "Released To Innocent Recipients",
      value: formatCurrency(recoveryMetrics.releasedToInnocentRecipients),
      sub: `${reviewAccounts.filter((account) => account.is_verified_legitimate).length} verified accounts`,
      icon: ShieldCheck,
      tone: "text-emerald-700",
      shell: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Recovery Percentage",
      value: `${recoveryMetrics.recoveryPercentage.toFixed(0)}%`,
      sub: "Recovered + protected amount",
      icon: Wallet,
      tone: "text-purple-700",
      shell: "bg-purple-50 border-purple-200",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
            Active Fraud Case
          </p>
          <h1 className="text-2xl font-bold text-foreground">{caseData.complaint_id}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Victim: <span className="font-semibold text-foreground">{caseData.victim_name}</span> |{" "}
            {caseData.victim_bank} | Initial fraud transfer rooted at {caseData.victim_account}
          </p>
          {importMeta.fileName && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-blue-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                {importMeta.origin === "bundled"
                  ? `Bundled testing dataset active: ${importMeta.fileName}`
                  : `Latest CSV import: ${importMeta.fileName} at ${new Date(importMeta.importedAt).toLocaleString()}`}
              </p>
              {importMeta.sourceFiles?.length > 0 && (
                <p className="text-[11px] text-slate-600">
                  Source files: {importMeta.sourceFiles.join(" | ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-3 py-1.5 font-semibold">
            <Clock className="w-3.5 h-3.5 mr-1" /> Investigation Active
          </Badge>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-3 py-1.5 font-semibold">
            <Snowflake className="w-3.5 h-3.5 mr-1" /> {immediateFreeze.length} Freeze Recommendations
          </Badge>
          {unreadCriticalAlerts > 0 && (
            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs px-3 py-1.5 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> {unreadCriticalAlerts} Critical Alerts
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`border ${card.shell} shadow-sm`}>
              <CardContent className="p-5">
                <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center mb-3">
                  <card.icon className={`w-6 h-6 ${card.tone}`} />
                </div>
                <p className={`text-2xl font-bold ${card.tone}`}>{card.value}</p>
                <p className="text-[13px] font-semibold text-foreground mt-0.5">{card.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="bg-white border border-border shadow-sm">
        <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">Data Management</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your dataset files from here and the full application will refresh according to the imported data.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <DatasetManagerDialog triggerLabel="Upload Investigation Data" triggerVariant="outline" triggerSize="default" />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Upload / View Graph", sub: "Dataset refresh + replay", path: "/graph", color: "bg-blue-600", icon: Network },
            { label: "Freeze Review", sub: `${immediateFreeze.length} ranked accounts`, path: "/freeze", color: "bg-slate-800", icon: Snowflake },
            { label: "Recovery", sub: `${recoveryMetrics.recoveryPercentage.toFixed(0)}% secured`, path: "/recovery", color: "bg-green-700", icon: Wallet },
            { label: "AI Insights", sub: "Patterns and explanations", path: "/ai-insights", color: "bg-amber-600", icon: CheckCircle2 },
          ].map((action) => (
            <Link key={action.path} to={action.path}>
              <div className={`${action.color} text-white rounded-2xl p-4 flex flex-col gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow`}>
                <action.icon className="w-6 h-6 text-white/85" />
                <p className="font-bold text-sm leading-tight">{action.label}</p>
                <p className="text-xs text-white/75">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Secured Recovery Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Recovered + frozen disputed amount</span>
                <span className="text-sm font-bold text-green-700">
                  {recoveryMetrics.recoveryPercentage.toFixed(0)}%
                </span>
              </div>
              <Progress value={recoveryMetrics.recoveryPercentage} className="h-3 rounded-full" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                <p className="text-xs text-green-700 font-semibold mb-1">Recovered</p>
                <p className="text-xl font-bold text-green-700">
                  {formatCurrency(recoveryMetrics.amountRecovered)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-xs text-blue-700 font-semibold mb-1">Frozen Hold</p>
                <p className="text-xl font-bold text-blue-700">
                  {formatCurrency(recoveryMetrics.amountFrozen)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {immediateFreeze.slice(0, 5).map((account) => (
                <div
                  key={account.account_number}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-semibold">{account.account_holder_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.bank_name} | Hold {formatCurrency(account.disputed_amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                    <Snowflake className="w-3 h-3 text-blue-600" />
                    <span className="text-xs text-blue-700 font-semibold">
                      Risk {account.risk_score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                Recent Transaction Flow
              </CardTitle>
              <Link to="/graph" className="text-xs text-blue-600 font-semibold hover:underline">
                Open graph
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.slice(0, 7).map((transaction) => {
                const sender = analytics.accountsByNumber[transaction.sender_account];
                const receiver = analytics.accountsByNumber[transaction.receiver_account];
                return (
                  <div
                    key={transaction.transaction_id}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      transaction.is_suspicious ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      transaction.is_suspicious ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      <IndianRupee className={`w-4 h-4 ${transaction.is_suspicious ? "text-red-600" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        {sender?.account_holder_name?.split(" ")[0] || transaction.sender_account} {"->"}{" "}
                        {receiver?.account_holder_name?.split(" ")[0] || transaction.receiver_account}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {transaction.transaction_type} | {transaction.reference_id}
                      </p>
                    </div>
                    <p className={`text-sm font-bold flex-shrink-0 ${
                      transaction.is_suspicious ? "text-red-600" : "text-foreground"
                    }`}>
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
