import React from "react";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  HandCoins,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Wallet,
} from "lucide-react";

import { useAppState } from "@/hooks/useAppState";
import { formatCurrency } from "@/lib/investigationEngine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";

function OverviewMetricCard({ icon: Icon, label, value, hint, shell, iconShell, valueTone }) {
  return (
    <Card className={`border shadow-sm ${shell}`}>
      <CardContent className="p-5">
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${iconShell}`}>
          <Icon className={`h-5 w-5 ${valueTone}`} />
        </div>
        <p className={`text-2xl font-bold ${valueTone}`}>{value}</p>
        <p className="mt-1 text-[13px] font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function AccountStrip({
  account,
  tone = "slate",
  actionLabel,
  actionDisabled = false,
  onAction,
  statusLabel,
}) {
  const toneMap = {
    slate: "border-slate-200 bg-white",
    emerald: "border-emerald-200 bg-emerald-50/60",
    amber: "border-amber-200 bg-amber-50/60",
    blue: "border-blue-200 bg-blue-50/60",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneMap[tone] || toneMap.slate}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{account.account_holder_name}</p>
            {statusLabel ? (
              <Badge className="border-0 bg-slate-900/5 text-slate-700">{statusLabel}</Badge>
            ) : null}
            <Badge className="border-0 bg-blue-100 text-blue-700">{account.bank_name}</Badge>
          </div>
          <p className="text-xs text-slate-500">{account.account_number}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
              Hold {formatCurrency(account.disputed_amount)}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              Release {formatCurrency(account.releaseable_amount)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              Balance {formatCurrency(account.current_balance)}
            </span>
          </div>
        </div>

        <div className="flex min-w-[200px] flex-col gap-2 lg:items-end">
          <div className="w-full max-w-xs">
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Legitimacy</span>
              <span className="font-semibold text-slate-700">{account.trust_score}/100</span>
            </div>
            <Progress value={account.trust_score || 0} className="h-2" />
          </div>
          <Button
            size="sm"
            variant={actionDisabled ? "outline" : "default"}
            className={actionDisabled ? "border-slate-300 text-slate-500" : ""}
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Recovery() {
  const { analytics, caseData, verifyLegitimateAccount, releaseDisputedAmount } = useAppState();

  const reviewAccounts = analytics.reviewAccounts || [];
  const immediateFreeze = analytics.immediateFreeze || [];
  const recoveryMetrics = analytics.recoveryMetrics || {};

  const verifiedQueue = reviewAccounts.filter(
    (account) => account.is_verified_legitimate && account.releaseable_amount > 0
  );
  const pendingVerification = reviewAccounts.filter(
    (account) => !account.is_verified_legitimate
  );
  const recoverableFrozen = immediateFreeze
    .filter(
      (account) => account.account_status === "frozen" && Number(account.disputed_amount || 0) > 0
    )
    .sort((left, right) => right.disputed_amount - left.disputed_amount)
    .slice(0, 6);

  const readyReleaseAmount = verifiedQueue.reduce(
    (sum, account) => sum + Number(account.releaseable_amount || 0),
    0
  );
  const totalFraudAmount = Number(recoveryMetrics.totalFraudAmount || 0);
  const frozenCoverage = totalFraudAmount
    ? Math.round((Number(recoveryMetrics.amountFrozen || 0) / totalFraudAmount) * 100)
    : 0;
  const safeReleaseCoverage = totalFraudAmount
    ? Math.round((readyReleaseAmount / totalFraudAmount) * 100)
    : 0;

  const handleRelease = (account) => {
    releaseDisputedAmount(account.account_number, account.releaseable_amount);
    toast({
      title: "Safe balance released",
      description: `${account.account_holder_name} can now access ${formatCurrency(account.releaseable_amount)}.`,
    });
  };

  const handleReleaseAllVerified = () => {
    if (!verifiedQueue.length) {
      toast({
        variant: "destructive",
        title: "No verified accounts ready",
        description: "Verify at least one legitimate recipient before batch release.",
      });
      return;
    }

    verifiedQueue.forEach((account) => {
      releaseDisputedAmount(account.account_number, account.releaseable_amount);
    });

    toast({
      title: "Verified queue released",
      description: `Released ${formatCurrency(readyReleaseAmount)} across ${verifiedQueue.length} verified recipient(s).`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#ffffff_45%,#fff7ed_100%)] shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <HandCoins className="h-3.5 w-3.5" />
              Recovery Command Center
            </div>

            <div className="space-y-2">
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-900">
                Build a safe release pipeline without losing control of the disputed money trail
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
                Case {caseData.complaint_id} is being recalculated from the active dataset. This page separates funds
                that must stay frozen from balances that can be returned to legitimate recipients after verification.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frozen Coverage</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">{frozenCoverage}%</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(recoveryMetrics.amountFrozen)} currently held across frozen accounts.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready Safe Release</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{safeReleaseCoverage}%</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatCurrency(readyReleaseAmount)} is cleared for verified recipients.
                </p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Attention</p>
                <p className="mt-2 text-2xl font-bold text-red-600">{pendingVerification.length}</p>
                <p className="mt-1 text-xs text-slate-500">
                  review candidate(s) still need legitimacy confirmation.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-emerald-200/70 bg-white/85 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Release Decision Flow
            </div>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "1. Hold disputed value",
                  body: "Keep the tainted trail frozen and visible for legal recovery.",
                  tone: "bg-blue-50 border-blue-200 text-blue-900",
                },
                {
                  title: "2. Verify legitimate recipient",
                  body: "Check uploaded proofs and confirm the account is not a suspect endpoint.",
                  tone: "bg-amber-50 border-amber-200 text-amber-900",
                },
                {
                  title: "3. Release safe balance",
                  body: "Return only the clean balance while preserving the disputed amount under hold.",
                  tone: "bg-emerald-50 border-emerald-200 text-emerald-900",
                },
              ].map((step) => (
                <div key={step.title} className={`rounded-2xl border p-4 ${step.tone}`}>
                  <p className="text-sm font-bold">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-80">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <OverviewMetricCard
          icon={Wallet}
          label="Total Fraud Amount"
          value={formatCurrency(recoveryMetrics.totalFraudAmount)}
          hint="Current disputed trail in this case"
          shell="border-red-200 bg-red-50"
          iconShell="bg-white"
          valueTone="text-red-700"
        />
        <OverviewMetricCard
          icon={Snowflake}
          label="Amount Frozen"
          value={formatCurrency(recoveryMetrics.amountFrozen)}
          hint={`${recoverableFrozen.length} frozen accounts in active view`}
          shell="border-blue-200 bg-blue-50"
          iconShell="bg-white"
          valueTone="text-blue-700"
        />
        <OverviewMetricCard
          icon={CircleDollarSign}
          label="Still Moving"
          value={formatCurrency(recoveryMetrics.amountStillMoving)}
          hint="Funds still outside protective hold"
          shell="border-orange-200 bg-orange-50"
          iconShell="bg-white"
          valueTone="text-orange-700"
        />
        <OverviewMetricCard
          icon={BadgeCheck}
          label="Ready To Release"
          value={formatCurrency(readyReleaseAmount)}
          hint={`${verifiedQueue.length} verified recipient(s) can be processed now`}
          shell="border-emerald-200 bg-emerald-50"
          iconShell="bg-white"
          valueTone="text-emerald-700"
        />
        <OverviewMetricCard
          icon={ShieldAlert}
          label="Recovery Percentage"
          value={`${Number(recoveryMetrics.recoveryPercentage || 0).toFixed(0)}%`}
          hint="Recovered or protected share of the trail"
          shell="border-slate-200 bg-slate-50"
          iconShell="bg-white"
          valueTone="text-slate-800"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Snowflake className="h-5 w-5 text-blue-600" />
                Protected Recovery Pool
              </CardTitle>
              <Badge className="w-fit border-0 bg-blue-100 text-blue-700">
                Frozen amounts still protected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recoverableFrozen.length ? (
              recoverableFrozen.map((account) => (
                <div key={account.account_number} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{account.account_holder_name}</p>
                        <Badge className="border-0 bg-blue-100 text-blue-700">{account.bank_name}</Badge>
                        <Badge className="border-0 bg-red-100 text-red-700">
                          Hold {formatCurrency(account.disputed_amount)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {account.account_number} | Current balance {formatCurrency(account.current_balance)}
                      </p>
                    </div>

                    <div className="min-w-[220px] space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Freeze protection</span>
                        <span className="font-semibold text-slate-700">
                          {Math.min(100, Math.round((account.freeze_priority || 0) * 10))}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, Math.round((account.freeze_priority || 0) * 10))}
                        className="h-2"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
                No frozen recovery candidates are available in the active dataset yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-emerald-200 bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_100%)] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Innocent Release Queue
              </CardTitle>
              <Badge className="w-fit border-0 bg-emerald-100 text-emerald-700">
                {verifiedQueue.length} verified ready now
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[0.9fr_0.9fr_1fr]">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Ready for Release</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">{verifiedQueue.length}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Verified accounts with safe releaseable balances
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">Total Amount</p>
                  <p className="mt-2 text-4xl font-bold text-slate-900">{formatCurrency(readyReleaseAmount)}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Clean balance that can be returned now
                  </p>
                </div>
                <Button
                  onClick={handleReleaseAllVerified}
                  className="min-h-[108px] rounded-2xl bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                >
                  Release All Verified
                </Button>
              </div>
            </div>

            {reviewAccounts.length ? (
              reviewAccounts.slice(0, 6).map((account) => (
                <AccountStrip
                  key={account.account_number}
                  account={account}
                  tone={account.is_verified_legitimate ? "emerald" : "amber"}
                  statusLabel={account.is_verified_legitimate ? "Verified" : "Pending Verification"}
                  actionLabel={account.is_verified_legitimate ? "Release Now" : "Verify First"}
                  actionDisabled={account.is_verified_legitimate ? !account.releaseable_amount : false}
                  onAction={() =>
                    account.is_verified_legitimate
                      ? handleRelease(account)
                      : verifyLegitimateAccount(account.account_number, true)
                  }
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center text-sm text-slate-500">
                No release-review candidates are available in the active dataset.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5 text-slate-700" />
              Verification Backlog
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingVerification.length ? (
              pendingVerification.slice(0, 6).map((account) => (
                <div
                  key={account.account_number}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-medium text-slate-900">{account.account_holder_name}</p>
                    <p className="text-xs text-slate-500">
                      {account.bank_name} | {account.supporting_documents.length} document(s)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyLegitimateAccount(account.account_number, true)}
                  >
                    Mark Verified
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Every review candidate is already verified.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-emerald-700" />
              Recovery Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Protected + recovered share</span>
                <span className="font-semibold text-slate-900">
                  {Number(recoveryMetrics.recoveryPercentage || 0).toFixed(1)}%
                </span>
              </div>
              <Progress value={Number(recoveryMetrics.recoveryPercentage || 0)} className="h-3" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-red-50 p-4">
                <p className="text-xs uppercase tracking-wide text-red-500">Still Moving</p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {formatCurrency(recoveryMetrics.amountStillMoving)}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-xs uppercase tracking-wide text-blue-500">Protected</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {formatCurrency(recoveryMetrics.amountFrozen)}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-500">Released</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatCurrency(recoveryMetrics.releasedToInnocentRecipients)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Operational takeaway</p>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-blue-600" />
                  Keep disputed balances frozen in the protected pool until the legal hold is cleared.
                </p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-amber-600" />
                  Move pending review accounts through verification faster to unlock safe releases.
                </p>
                <p className="flex items-start gap-2">
                  <ArrowRight className="mt-0.5 h-4 w-4 text-emerald-600" />
                  Batch-release only verified recipients to avoid reopening suspect paths.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
