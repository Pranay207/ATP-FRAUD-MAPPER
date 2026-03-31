import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

import { useAppState } from "@/hooks/useAppState";

const CLASSIFICATION_COLORS = {
  victim: "#3b82f6",
  mastermind: "#ef4444",
  splitter: "#f97316",
  mule: "#eab308",
  cashout: "#a855f7",
  innocent: "#22c55e",
  unknown: "#6b7280",
};

export default function RiskDistribution() {
  const { analytics } = useAppState();

  const classificationCounts = analytics.accounts.reduce((acc, account) => {
    const key = account.classification || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const data = Object.entries(classificationCounts).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: CLASSIFICATION_COLORS[name] || CLASSIFICATION_COLORS.unknown,
  }));

  return (
    <div className="flex items-center gap-6">
      <div className="w-36 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(222 44% 10%)",
                border: "1px solid hsl(222 30% 20%)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 min-w-[140px]">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-muted-foreground">{item.name}</span>
            <span className="text-xs font-semibold ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
