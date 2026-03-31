import React from "react";

import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "text-slate-700",
  shell = "bg-white border-border",
}) {
  return (
    <Card className={`border ${shell} shadow-sm`}>
      <CardContent className="p-5">
        {Icon && (
          <div className="w-11 h-11 rounded-xl bg-white/80 flex items-center justify-center mb-3">
            <Icon className={`w-6 h-6 ${tone}`} />
          </div>
        )}
        <p className={`text-2xl font-bold ${tone}`}>{value}</p>
        <p className="text-[13px] font-semibold text-foreground mt-0.5">{label}</p>
        {sub ? <p className="text-xs text-muted-foreground mt-0.5">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}
