import React from "react";
import {
  ArrowRight,
  Building2,
  GitBranch,
  Landmark,
  Network,
  ShieldAlert,
  Snowflake,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";

export default function Banks() {
  const { analytics, caseData } = useAppState();
  const crossBankNetwork = analytics.crossBankNetwork;
  const institutions = crossBankNetwork?.institutions || [];
  const edges = crossBankNetwork?.edges || [];
  const chainPreviews = crossBankNetwork?.chainPreviews || [];
  const highestRiskEdge = crossBankNetwork?.summary?.highestRiskEdge;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Cross-Bank Fraud Network Mapping</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Institution-level fraud chain for case {caseData.complaint_id}, showing how money moved across banks and wallets.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Landmark className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-700">
              {crossBankNetwork?.summary?.institutionCount || 0}
            </p>
            <p className="text-sm font-semibold">Institutions involved</p>
            <p className="text-xs text-muted-foreground mt-1">
              Banks and wallet rails touched in the fraud chain.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <GitBranch className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-700">
              {crossBankNetwork?.summary?.edgeCount || 0}
            </p>
            <p className="text-sm font-semibold">Cross-bank links</p>
            <p className="text-xs text-muted-foreground mt-1">
              Distinct institution-to-institution fraud routes.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {formatCurrency(crossBankNetwork?.summary?.totalCrossBankAmount || 0)}
            </p>
            <p className="text-sm font-semibold">Cross-bank fraud amount</p>
            <p className="text-xs text-muted-foreground mt-1">
              Aggregate value seen on inter-institution transfers.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
              <ArrowRight className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-sm font-bold text-violet-700">
              {highestRiskEdge ? `${highestRiskEdge.from} -> ${highestRiskEdge.to}` : "No route"}
            </p>
            <p className="text-sm font-semibold mt-1">Highest-value bank hop</p>
            <p className="text-xs text-muted-foreground mt-1">
              {highestRiskEdge ? formatCurrency(highestRiskEdge.total_amount) : "No cross-bank flow detected yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-600" />
            Complete Institution Chain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {chainPreviews.length ? (
            chainPreviews.map((path) => (
              <div key={path.id} className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                    {formatCurrency(path.total_amount)}
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    {path.transaction_count} transfers
                  </Badge>
                  {path.victim_origin && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      Victim-origin chain
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                  {path.institutions.map((institution, index) => (
                    <React.Fragment key={`${path.id}-${institution}-${index}`}>
                      <span className="rounded-lg bg-white px-3 py-1 border border-blue-100">
                        {institution}
                      </span>
                      {index < path.institutions.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No cross-bank chain is available yet. Import more transaction history to map the full institution trail.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              Institution Risk Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {institutions.map((institution) => (
              <div
                key={institution.institution}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{institution.institution}</p>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    Suspicious flow {formatCurrency(institution.suspicious_flow)}
                  </Badge>
                  {institution.frozen_accounts > 0 && (
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                      <Snowflake className="w-3 h-3 mr-1" /> {institution.frozen_accounts} frozen
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mt-3">
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <p className="text-muted-foreground">Accounts</p>
                    <p className="font-semibold mt-1">{institution.accounts_involved}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <p className="text-muted-foreground">Incoming</p>
                    <p className="font-semibold mt-1">{formatCurrency(institution.incoming_flow)}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <p className="text-muted-foreground">Outgoing</p>
                    <p className="font-semibold mt-1">{formatCurrency(institution.outgoing_flow)}</p>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200 p-2">
                    <p className="text-muted-foreground">Suspect accts</p>
                    <p className="font-semibold mt-1">{institution.suspect_accounts}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-blue-600" />
              Cross-Bank Fraud Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {edges.length ? (
              edges.map((edge) => (
                <div
                  key={`${edge.from}-${edge.to}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                      {edge.transfer_count} transfer(s)
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                      {formatCurrency(edge.total_amount)}
                    </Badge>
                    {edge.suspicious_count > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                        {edge.suspicious_count} suspicious
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                    <span className="rounded-lg bg-white px-3 py-1 border border-slate-200">
                      {edge.from}
                    </span>
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <span className="rounded-lg bg-white px-3 py-1 border border-slate-200">
                      {edge.to}
                    </span>
                  </div>

                  {edge.sample_references.length ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Sample refs: {edge.sample_references.join(", ")}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                No cross-bank movement is available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
