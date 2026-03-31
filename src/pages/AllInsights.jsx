import React from "react";
import {
  AlertTriangle,
  Brain,
  FileSearch,
  Fingerprint,
  GitBranchPlus,
  Link2,
  Radar,
  ShieldCheck,
  Target,
  UserRound,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";

export default function AllInsights() {
  const { analytics, caseData } = useAppState();

  const rapidSplits = analytics.accounts.filter((account) => account.stats.rapid_split);
  const velocityBursts = analytics.accounts.filter((account) => account.stats.high_velocity);
  const protectedAccounts = analytics.reviewAccounts.filter((account) => account.trust_score >= 70);
  const nextTargets = analytics.nextTransferPredictions || [];
  const criminalNetworks = analytics.criminalNetworks || [];
  const freezeStrategy = analytics.recoveryOptimizer?.freezeStrategy || [];
  const behaviorFingerprint = analytics.behaviorFingerprint;
  const muleDetections = analytics.muleDetector?.muleAccountDetections || [];
  const speedDetections = analytics.fraudSpeedDetection?.detections || [];
  const preWithdrawalTargets =
    analytics.preWithdrawalFraudLock?.emergencyFreezeTargets || [];
  const digitalCriminalTwins =
    analytics.digitalCriminalTwin?.profiles || [];
  const dominoTarget = analytics.fraudDominoCollapseSystem?.topTarget;
  const humanVulnerability = analytics.humanVulnerabilityDetector;
  const victimProtection = analytics.emergencyVictimProtectionMode;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Investigation Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Automated pattern summary, risk explanations, and officer-ready recommendations for case {caseData.complaint_id}.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">{rapidSplits.length}</p>
            <p className="text-sm font-semibold">Rapid fund splitting patterns</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts that redistributed funds to multiple beneficiaries within 15 minutes.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
              <Radar className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-700">{velocityBursts.length}</p>
            <p className="text-sm font-semibold">High-velocity burst accounts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts with dense transaction bursts inside a 10-minute window.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
              <Radar className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-700">{speedDetections.length}</p>
            <p className="text-sm font-semibold">Fraud speed alerts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts moving money in abnormal bursts before likely withdrawal.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">{preWithdrawalTargets.length}</p>
            <p className="text-sm font-semibold">Emergency freeze targets</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accounts predicted to withdraw disputed funds in the next few minutes.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">{protectedAccounts.length}</p>
            <p className="text-sm font-semibold">Likely innocent recipients</p>
            <p className="text-xs text-muted-foreground mt-1">
              High-legitimacy accounts that are better suited for partial release review.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {nextTargets[0]?.probability || 0}%
            </p>
            <p className="text-sm font-semibold">Fraud prediction confidence</p>
            <p className="text-xs text-muted-foreground mt-1">
              Highest-probability suspicious receiver predicted by the model.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <Link2 className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-violet-700">
              {criminalNetworks.length}
            </p>
            <p className="text-sm font-semibold">Fraud networks identified</p>
            <p className="text-xs text-muted-foreground mt-1">
              Linked clusters of suspect accounts under likely common control.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-50 flex items-center justify-center mb-3">
              <Fingerprint className="w-5 h-5 text-fuchsia-600" />
            </div>
            <p className="text-2xl font-bold text-fuchsia-700">
              {behaviorFingerprint?.confidence || 0}%
            </p>
            <p className="text-sm font-semibold">Behavior fingerprint confidence</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pattern-based fraud classification that remains useful even when accounts change.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <GitBranchPlus className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {muleDetections.length}
            </p>
            <p className="text-sm font-semibold">Mule accounts detected</p>
            <p className="text-xs text-muted-foreground mt-1">
              New accounts receiving from multiple sources and cashing out quickly.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
              <Brain className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-700">
              {digitalCriminalTwins[0]?.confidence || 0}%
            </p>
            <p className="text-sm font-semibold">Digital criminal twin confidence</p>
            <p className="text-xs text-muted-foreground mt-1">
              AI profile predicting which accounts likely belong to the same mastermind.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <UserRound className="w-5 h-5 text-amber-700" />
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {humanVulnerability?.vulnerabilityScore || 0}%
            </p>
            <p className="text-sm font-semibold">Citizen vulnerability risk</p>
            <p className="text-xs text-muted-foreground mt-1">
              Prevention profile for likely repeat or high-pressure fraud victims.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {victimProtection?.protectionScore || 0}%
            </p>
            <p className="text-sm font-semibold">Emergency victim protection</p>
            <p className="text-xs text-muted-foreground mt-1">
              Active protection package to stop further loss after reporting.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <Target className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">
              {dominoTarget?.collapse_score || 0}%
            </p>
            <p className="text-sm font-semibold">Domino collapse impact</p>
            <p className="text-xs text-muted-foreground mt-1">
              Best single freeze decision for breaking the largest part of the fraud chain.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserRound className="w-5 h-5 text-amber-700" />
              Human Vulnerability Detector
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{humanVulnerability?.profileLabel}</p>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                  Risk {humanVulnerability?.vulnerabilityScore || 0}%
                </Badge>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {humanVulnerability?.victimName} | {humanVulnerability?.bankName}
              </p>
              <div className="flex flex-wrap gap-2 text-xs mt-2">
                {humanVulnerability?.age && (
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    Age {humanVulnerability.age}+
                  </Badge>
                )}
                <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                  Scam calls {humanVulnerability?.scamCalls || 0}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                  Phishing contacts {humanVulnerability?.phishingMessages || 0}
                </Badge>
                <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                  Prior complaints {humanVulnerability?.priorComplaints || 0}
                </Badge>
              </div>
              {(humanVulnerability?.signals || []).map((line) => (
                <p key={line} className="text-xs text-slate-700 mt-1">
                  {line}
                </p>
              ))}
            </div>

            <div className="space-y-2">
              {(humanVulnerability?.preventionActions || []).map((line) => (
                <p key={line} className="text-xs text-slate-700">
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
              Emergency Victim Protection Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-sm">{victimProtection?.status}</p>
                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                  Protection {victimProtection?.protectionScore || 0}%
                </Badge>
              </div>
              <p className="text-xs text-slate-800 font-medium">
                {victimProtection?.victimName} | {victimProtection?.victimBank} | {victimProtection?.victimAccount}
              </p>
              {(victimProtection?.monitoredSignals || []).map((line) => (
                <p key={line} className="text-xs text-slate-700 mt-1">
                  {line}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(victimProtection?.actions || []).map((action) => (
                <div key={action.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    {action.title}
                  </p>
                  <p className="text-[11px] text-slate-700 mt-2">{action.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {(victimProtection?.protectedTargets || []).map((target) => (
                <div key={`${target.account_number}-${target.reason}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-900">
                    {target.account_holder_name} ({target.account_number})
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {target.bank_name} | {target.reason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Fraud Domino Collapse System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dominoTarget ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{dominoTarget.account_holder_name}</p>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    Collapse {dominoTarget.collapse_score}%
                  </Badge>
                  <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                    Block {dominoTarget.disrupted_transactions} txn
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    Hold {formatCurrency(dominoTarget.recoverable_hold)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Freeze first: {dominoTarget.bank_name} | {dominoTarget.account_number}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    Downstream accounts {dominoTarget.downstream_accounts_blocked}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    Downstream amount {formatCurrency(dominoTarget.downstream_amount_blocked)}
                  </Badge>
                </div>
                {dominoTarget.reasons.map((line) => (
                  <p key={line} className="text-xs text-slate-700 mt-1">
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No strong first-freeze domino target is available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Digital Criminal Twin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {digitalCriminalTwins.length ? (
              digitalCriminalTwins.map((profile) => (
                <div
                  key={profile.id}
                  className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{profile.name}</p>
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">
                      {profile.label}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      Confidence {profile.confidence}%
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Suspected controller: {profile.suspected_controller.account_holder_name} ({profile.suspected_controller.account_number})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profile.member_count} linked account(s) | Fraud type {profile.fraud_type} | Timing {profile.timing_signature}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs mt-2">
                    {profile.device_fingerprints.map((deviceId) => (
                      <Badge key={deviceId} className="bg-slate-100 text-slate-700 border-0 text-xs">
                        Device {deviceId}
                      </Badge>
                    ))}
                    {profile.ip_addresses.map((ipAddress) => (
                      <Badge key={ipAddress} className="bg-slate-100 text-slate-700 border-0 text-xs">
                        IP {ipAddress}
                      </Badge>
                    ))}
                    {profile.locations.map((location) => (
                      <Badge key={location} className="bg-slate-100 text-slate-700 border-0 text-xs">
                        {location}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-2">
                    Same-mastermind accounts:{" "}
                    {profile.controlled_accounts
                      .map((account) => `${account.account_holder_name} (${account.account_number})`)
                      .join(", ")}
                  </p>
                  {profile.evidence.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                  <p className="text-xs font-semibold text-indigo-700 mt-2">
                    {profile.recommendation}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No mastermind profile is strong enough yet. Add more linked device, IP, and timing evidence to improve clustering.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Pre-Withdrawal Fraud Lock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preWithdrawalTargets.length ? (
              preWithdrawalTargets.map((target) => (
                <div
                  key={target.account_number}
                  className="rounded-xl border border-red-100 bg-red-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{target.account_holder_name}</p>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      {target.status}
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                      Risk {target.withdrawal_risk}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Hold {formatCurrency(target.disputed_amount)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {target.bank_name} | {target.account_number}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Withdraw window {target.predicted_withdrawal_window_minutes} min
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Latest inflow {formatCurrency(target.latest_incoming_amount)}
                    </Badge>
                    {target.likely_network && (
                      <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                        {target.likely_network}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-red-700 mt-2">
                    {target.recommended_action}
                  </p>
                  {target.reasons.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No account currently crosses the emergency withdrawal-risk threshold.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Radar className="w-5 h-5 text-rose-600" />
              Fraud Speed Detection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {speedDetections.length ? (
              speedDetections.map((detection) => (
                <div
                  key={detection.account_number}
                  className="rounded-xl border border-rose-100 bg-rose-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{detection.account_holder_name}</p>
                    <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">
                      {detection.status}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      Confidence {detection.confidence}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {detection.bank_name} | {detection.account_number}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      {detection.transfer_count} transfers
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      {detection.window_minutes} minute window
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      {formatCurrency(detection.total_amount)}
                    </Badge>
                  </div>
                  {detection.reasons.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No abnormal transaction speed burst is strong enough yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <GitBranchPlus className="w-5 h-5 text-amber-600" />
              Mule Account Detector
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {muleDetections.length ? (
              muleDetections.map((account) => (
                <div
                  key={account.account_number}
                  className="rounded-xl border border-amber-100 bg-amber-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{account.account_holder_name}</p>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                      {account.status}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      Confidence {account.confidence}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {account.bank_name} | {account.account_number}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Age {account.account_age_days} days
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Received from {account.incoming_sources} accounts
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Effective sources {account.effective_source_count}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Fast cashouts {account.fast_cashout_instances}
                    </Badge>
                  </div>
                  {account.reasons.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No account currently matches the mule profile strongly enough.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-fuchsia-600" />
              Fraud Behavior Fingerprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-fuchsia-100 bg-fuchsia-50 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="font-semibold text-sm">Pattern Detected</p>
                <Badge className="bg-fuchsia-100 text-fuchsia-700 border-0 text-xs">
                  {behaviorFingerprint?.patternSummary}
                </Badge>
              </div>
              <p className="text-xs text-slate-700 font-medium">
                Fraud Type: {behaviorFingerprint?.fraudType}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Confidence: {behaviorFingerprint?.confidence}% 
              </p>
              <p className="text-sm text-slate-800 mt-2">
                {behaviorFingerprint?.explanation}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(behaviorFingerprint?.topPatterns || []).map((pattern) => (
                <div key={pattern} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                    Pattern
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{pattern}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {(behaviorFingerprint?.evidence || []).map((line) => (
                <p key={line} className="text-xs text-slate-700">
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-violet-600" />
              Fraudster Network Identification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criminalNetworks.length ? (
              criminalNetworks.map((network) => (
                <div
                  key={network.id}
                  className="rounded-xl border border-violet-100 bg-violet-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{network.name}</p>
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">
                      {network.label}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      Max risk {network.highest_risk_score}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {network.member_count} linked accounts | {network.transaction_count} internal transfers | Hold {formatCurrency(network.total_disputed_amount)}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {network.path_preview}
                  </p>
                  {network.key_indicators.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No multi-account fraud network is strong enough yet. Upload more linked transactions to improve grouping.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Fraud Prediction Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextTargets.length ? (
              nextTargets.map((target) => (
                <div
                  key={target.account_number}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{target.account_holder_name}</p>
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                      {target.probability}% probability
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                      Likely amount {formatCurrency(target.predicted_amount)}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Next possible suspicious receiver account
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {target.bank_name} | {target.account_number} | {target.recommendation}
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    Possible sources:{" "}
                    {target.likely_source_accounts
                      .map((source) => `${source.account_holder_name} (${source.account_number})`)
                      .join(", ")}
                  </p>
                  {target.reasons.map((line) => (
                    <p key={line} className="text-xs text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No strong suspicious-account prediction is available yet. Upload more transaction history to improve the model.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-red-600" />
              Smart Recovery Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {freezeStrategy.slice(0, 4).map((candidate, index) => (
              <div key={candidate.account_number} className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">
                    Freeze Account {String.fromCharCode(65 + index)}
                  </p>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    Potential recovery {formatCurrency(candidate.estimated_recovery)}
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  {candidate.account_holder_name} | {candidate.account_number}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {candidate.action}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Top Freeze Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.immediateFreeze.slice(0, 8).map((account) => (
              <div key={account.account_number} className="rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{account.account_holder_name}</p>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">Risk {account.risk_score}</Badge>
                  <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">
                    Hold {formatCurrency(account.disputed_amount)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {account.bank_name} | {account.account_number}
                </p>
                {account.explanation.slice(0, 3).map((line) => (
                  <p key={line} className="text-xs text-slate-700">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-emerald-600" />
              Partial Release Review Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.reviewAccounts.slice(0, 8).map((account) => (
              <div key={account.account_number} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{account.account_holder_name}</p>
                  <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                    Legitimacy {account.trust_score}
                  </Badge>
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    Release {formatCurrency(account.releaseable_amount)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Hold only {formatCurrency(account.disputed_amount)} after proof review.
                </p>
                {account.explanation.slice(0, 3).map((line) => (
                  <p key={line} className="text-xs text-slate-700">
                    {line}
                  </p>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
