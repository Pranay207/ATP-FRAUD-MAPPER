import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  FileText,
  Shield,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MANAGED_FILE_ACCEPT } from "@/lib/fileManagement";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";

const CLASS_META = {
  victim: { label: "Victim", emoji: "V", desc: "Origin account of the fraud amount.", icon: User, textColor: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-300" },
  mastermind: { label: "Mastermind", emoji: "M", desc: "Controls or initiates suspicious distribution.", icon: AlertTriangle, textColor: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-300" },
  splitter: { label: "Splitter", emoji: "S", desc: "Fragments funds rapidly to downstream accounts.", icon: ArrowDownRight, textColor: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-300" },
  mule: { label: "Mule", emoji: "U", desc: "Intermediate relay holding or forwarding tainted funds.", icon: ArrowUpRight, textColor: "text-yellow-700", bgColor: "bg-yellow-50", borderColor: "border-yellow-300" },
  cashout: { label: "Cashout", emoji: "C", desc: "Terminal receiver likely holding disputed proceeds.", icon: ArrowDownRight, textColor: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-300" },
  innocent: { label: "Innocent", emoji: "I", desc: "Likely legitimate recipient pending protective review.", icon: Shield, textColor: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-300" },
  unknown: { label: "Unknown", emoji: "?", desc: "Requires more evidence and officer review.", icon: FileText, textColor: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-300" },
};

export default function Classification() {
  const {
    accounts,
    updateAccountClassification,
    uploadSupportingDocuments,
    verifyLegitimateAccount,
  } = useAppState();
  const [filter, setFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);

  const allClasses = Object.keys(CLASS_META);
  const filteredAccounts =
    filter === "all" ? accounts : accounts.filter((account) => account.classification === filter);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Risk, Legitimacy & Account Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review computed scores, evidence explanations, uploaded documents, and role assignments for every account.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 rounded-2xl border-2 text-center transition-all hover:shadow-md ${
            filter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-border"
          }`}
        >
          <p className="text-2xl font-bold">{accounts.length}</p>
          <p className="text-xs font-semibold mt-1">All Accounts</p>
        </button>
        {allClasses.map((classification) => {
          const meta = CLASS_META[classification];
          const count = accounts.filter((account) => account.classification === classification).length;
          return (
            <button
              key={classification}
              onClick={() => setFilter(classification)}
              className={`p-4 rounded-2xl border-2 text-center transition-all hover:shadow-md ${
                filter === classification ? `${meta.bgColor} ${meta.borderColor}` : "bg-white border-border"
              }`}
            >
              <p className="text-2xl mb-1">{meta.emoji}</p>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">{meta.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAccounts.map((account) => {
          const meta = CLASS_META[account.classification] || CLASS_META.unknown;
          const isEditing = editingId === account.account_number;

          return (
            <Card key={account.account_number} className={`bg-white border-2 ${meta.borderColor} shadow-sm`}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold">{account.account_holder_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.account_number} | {account.bank_name}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl ${meta.bgColor} ${meta.borderColor} border`}>
                    <span className="text-lg">{meta.emoji}</span>
                    <span className={`ml-1.5 text-xs font-bold ${meta.textColor}`}>{meta.label}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">{meta.desc}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Risk Score</p>
                    <div className="flex items-center gap-2">
                      <Progress value={account.risk_score} className="h-2 flex-1" />
                      <span className="text-xs font-bold text-red-700">{account.risk_score}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Legitimacy Score</p>
                    <div className="flex items-center gap-2">
                      <Progress value={account.trust_score} className="h-2 flex-1" />
                      <span className="text-xs font-bold text-green-700">{account.trust_score}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-muted-foreground">Disputed amount</p>
                    <p className="font-bold mt-1">{formatCurrency(account.disputed_amount)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-muted-foreground">Releaseable amount</p>
                    <p className="font-bold mt-1">{formatCurrency(account.releaseable_amount)}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-2">
                    Score explanation
                  </p>
                  <div className="space-y-1">
                    {account.explanation.map((line) => (
                      <p key={line} className="text-xs text-slate-700">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>Level {account.chain_depth_level}</span>
                    <span>|</span>
                    <span>{account.account_status === "frozen" ? "Frozen" : "Active"}</span>
                    <span>|</span>
                    <span>{account.supporting_documents.length} doc(s)</span>
                    {account.is_verified_legitimate && <span>| Verified</span>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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
                      <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-accent hover:text-accent-foreground">
                        Upload Docs
                      </span>
                    </label>

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => verifyLegitimateAccount(account.account_number, !account.is_verified_legitimate)}
                    >
                      {account.is_verified_legitimate ? "Verified" : "Mark Verified"}
                    </Button>

                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setEditingId(isEditing ? null : account.account_number)}
                      >
                        Reclassify <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                      {isEditing && (
                        <div className="absolute right-0 top-8 z-10 bg-white border border-border rounded-xl shadow-lg p-2 w-44 space-y-1">
                          {allClasses.map((classification) => (
                            <button
                              key={classification}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold hover:bg-gray-50 flex items-center gap-2 ${
                                account.classification === classification ? "bg-blue-50 text-blue-700" : ""
                              }`}
                              onClick={() => {
                                updateAccountClassification(account.account_number, classification);
                                setEditingId(null);
                              }}
                            >
                              <span>{CLASS_META[classification].emoji}</span>
                              {CLASS_META[classification].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Managed files: PDF, Word, Excel, CSV, text, presentation, and image proof files.
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
