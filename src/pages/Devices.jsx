import React from "react";
import {
  AlertTriangle,
  Link2,
  MapPin,
  Smartphone,
  UserRound,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/useAppState";

export default function Devices() {
  const { analytics } = useAppState();
  const identity = analytics.identityLinkDetection;
  const linkedClusters = identity?.linkedClusters || [];
  const sharedMobileGroups = identity?.sharedMobileGroups || [];
  const sharedDeviceGroups = identity?.sharedDeviceGroups || [];
  const sharedIpGroups = identity?.sharedIpGroups || [];

  const evidenceCards = [
    {
      label: "Shared Mobiles",
      value: identity?.summary?.sharedMobiles || 0,
      icon: UserRound,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Shared Devices",
      value: identity?.summary?.sharedDevices || 0,
      icon: Smartphone,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Shared IPs",
      value: identity?.summary?.sharedIps || 0,
      icon: Wifi,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Linked Identity Clusters",
      value: identity?.summary?.linkedIdentityClusters || 0,
      icon: Link2,
      tone: "bg-red-50 text-red-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Link2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Identity Link Detection</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Detect linked accounts using shared mobile numbers, devices, and IP addresses.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {evidenceCards.map((card) => (
          <Card key={card.label} className="bg-white border border-border shadow-sm">
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.tone}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm font-semibold mt-1">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {linkedClusters.length > 0 && (
        <Card className="bg-red-50 border border-red-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-semibold text-red-800">
                One controller may be operating multiple accounts
              </span>
            </div>
            <p className="text-xs text-red-700">
              {linkedClusters.length} linked identity cluster(s) were found using mobile, device, and IP overlaps.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Link2 className="w-5 h-5 text-red-600" />
            Linked Account Clusters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {linkedClusters.length ? (
            linkedClusters.map((cluster) => (
              <div
                key={cluster.id}
                className="rounded-xl border border-red-100 bg-red-50 p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-sm">{cluster.label}</p>
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                    {cluster.member_count} linked accounts
                  </Badge>
                  <Badge className="bg-slate-100 text-slate-700 border-0 text-xs">
                    Max risk {cluster.max_risk_score}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{cluster.path_preview}</p>
                <div className="space-y-1">
                  {cluster.evidence.map((line) => (
                    <p key={line} className="text-xs text-slate-700">
                      {line}
                    </p>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {cluster.members.map((member) => (
                    <Badge
                      key={member.account_number}
                      className="bg-white text-slate-700 border border-red-100 text-xs"
                    >
                      {member.account_number}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
              No linked identity cluster is strong enough yet.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {[
          {
            title: "Same Mobile Number",
            icon: UserRound,
            tone: "text-emerald-700",
            border: "border-emerald-100",
            bg: "bg-emerald-50",
            groups: sharedMobileGroups,
          },
          {
            title: "Same Device",
            icon: Smartphone,
            tone: "text-blue-700",
            border: "border-blue-100",
            bg: "bg-blue-50",
            groups: sharedDeviceGroups,
          },
          {
            title: "Same IP Address",
            icon: Wifi,
            tone: "text-violet-700",
            border: "border-violet-100",
            bg: "bg-violet-50",
            groups: sharedIpGroups,
          },
        ].map((section) => (
          <Card key={section.title} className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className={`text-base font-bold flex items-center gap-2 ${section.tone}`}>
                <section.icon className="w-5 h-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.groups.length ? (
                section.groups.map((group) => (
                  <div
                    key={`${section.title}-${group.value}`}
                    className={`rounded-xl border p-4 ${section.border} ${section.bg}`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                      {group.value}
                    </p>
                    <div className="mt-2 space-y-2">
                      {group.linked_accounts.map((account) => (
                        <div key={account.account_number} className="flex items-center justify-between gap-2 text-xs">
                          <div>
                            <p className="font-semibold text-slate-900">{account.account_holder_name}</p>
                            <p className="text-muted-foreground">{account.account_number}</p>
                          </div>
                          <Badge className="bg-white text-slate-700 border border-slate-200 text-[11px]">
                            Risk {account.risk_score}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No shared evidence found.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-white border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-700" />
            Complete Identity Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Account</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Mobile</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Device</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">IP Address</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Linked Cluster</th>
                </tr>
              </thead>
              <tbody>
                {analytics.accounts
                  .filter((account) => account.account_number !== analytics.victimAccount)
                  .map((account) => {
                    const cluster = identity?.clusterByAccount?.[account.account_number];
                    return (
                      <tr key={account.account_number} className="border-b border-border/50 hover:bg-slate-50">
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-semibold">{account.account_holder_name}</p>
                            <p className="text-muted-foreground">{account.account_number}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{account.mobile_number || "NA"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{account.device_id || "NA"}</td>
                        <td className="py-2 px-3 text-muted-foreground">{account.ip_address || "NA"}</td>
                        <td className="py-2 px-3">
                          {cluster ? (
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                              {cluster.id}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">No cluster</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
