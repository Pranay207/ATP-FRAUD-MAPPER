import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAppState } from "@/hooks/useAppState";
import { formatCurrency } from "@/lib/investigationEngine";

function buildMoneyFlowData(transactions = []) {
  if (!transactions.length) {
    return [];
  }

  const grouped = new Map();

  transactions.forEach((transaction) => {
    const date = new Date(transaction.timestamp);
    const timeLabel = Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

    if (!grouped.has(timeLabel)) {
      grouped.set(timeLabel, {
        name: timeLabel,
        inflow: 0,
        outflow: 0,
        sortValue: Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime(),
      });
    }

    const entry = grouped.get(timeLabel);
    const amount = Number(transaction.amount || 0);

    if (transaction.transaction_type === "case_entry" || transaction.sender_account?.startsWith("CASE-")) {
      entry.inflow += amount;
      return;
    }

    entry.outflow += amount;
  });

  return [...grouped.values()]
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 12)
    .map(({ sortValue, ...entry }) => entry);
}

export default function MoneyFlowChart() {
  const { analytics } = useAppState();
  const data = buildMoneyFlowData(analytics.transactions);

  if (!data.length) {
    return (
      <div className="h-52 rounded-xl border border-dashed border-border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
        No transaction data available.
      </div>
    );
  }

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
            axisLine={{ stroke: "hsl(222 30% 16%)" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
            axisLine={{ stroke: "hsl(222 30% 16%)" }}
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 44% 10%)",
              border: "1px solid hsl(222 30% 20%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value, key) => [
              formatCurrency(Number(value || 0)),
              key === "inflow" ? "Inflow" : "Outflow",
            ]}
          />
          <Bar dataKey="inflow" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="outflow" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
