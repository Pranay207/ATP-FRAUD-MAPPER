import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  DollarSign,
  Fingerprint,
  Flag,
  Gauge,
  Link2,
  MapPin,
  Snowflake,
  Smartphone,
  UserPlus,
  XCircle,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAppState } from "@/hooks/useAppState";
import {
  markAlertRead,
  markAllAlertsRead,
  updateAlertAction,
} from "@/lib/appState";

const ALERT_ICONS = {
  emergency_freeze: AlertTriangle,
  abnormal_speed: Gauge,
  rapid_transfer: Zap,
  shared_device: Smartphone,
  deep_chain: Link2,
  multi_location: MapPin,
  high_velocity: Gauge,
  large_cashout: DollarSign,
  new_account: UserPlus,
  pattern_match: Fingerprint,
};

const ALERT_LABELS = {
  emergency_freeze: "Emergency Freeze",
  abnormal_speed: "Fraud Speed",
  rapid_transfer: "Rapid Transfer",
  shared_device: "Shared Device",
  deep_chain: "Deep Chain",
  multi_location: "Multiple Locations",
  high_velocity: "High Velocity",
  large_cashout: "Large Cashout",
  new_account: "New Account",
  pattern_match: "Pattern Match",
};

const ACTION_STYLES = {
  none: "bg-gray-100 text-gray-600",
  flagged: "bg-yellow-100 text-yellow-700",
  frozen: "bg-blue-100 text-blue-700",
  escalated: "bg-purple-100 text-purple-700",
  dismissed: "bg-gray-100 text-gray-400",
};

export default function Alerts() {
  const { alerts, accounts } = useAppState();
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? alerts : alerts.filter((alert) => alert.severity === filter);
  const unread = alerts.filter((alert) => !alert.is_read).length;
  const critical = alerts.filter((alert) => alert.severity === "critical").length;

  const tabs = [
    { key: "all", label: `All (${alerts.length})` },
    { key: "critical", label: `Critical (${critical})` },
    { key: "high", label: "High" },
    { key: "medium", label: "Medium" },
  ];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Alert Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0 ? `${unread} unread alerts need your attention` : "All alerts have been reviewed"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" className="gap-2" onClick={markAllAlertsRead}>
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
              filter === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white border-border text-foreground hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((alert, idx) => {
            const Icon = ALERT_ICONS[alert.alert_type] || Bell;
            const account = accounts.find((item) => item.account_number === alert.account_number);
            const realIdx = alerts.indexOf(alert);

            return (
              <motion.div
                key={realIdx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.04 }}
              >
                <Card
                  className={`bg-white border-2 shadow-sm ${
                    alert.action_taken === "dismissed"
                      ? "opacity-60"
                      : !alert.is_read
                        ? "border-blue-300"
                        : "border-border"
                  }`}
                  onClick={() => !alert.is_read && markAlertRead(realIdx)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          alert.severity === "critical"
                            ? "bg-red-100"
                            : alert.severity === "high"
                              ? "bg-orange-100"
                              : alert.severity === "medium"
                                ? "bg-yellow-100"
                                : "bg-blue-100"
                        }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${
                            alert.severity === "critical"
                              ? "text-red-600"
                              : alert.severity === "high"
                                ? "text-orange-600"
                                : alert.severity === "medium"
                                  ? "text-yellow-600"
                                  : "text-blue-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            className={`${
                              alert.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : alert.severity === "high"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                            } border-0 text-xs font-bold`}
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {ALERT_LABELS[alert.alert_type]}
                          </span>
                          {!alert.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                        </div>
                        <p className="text-sm font-medium leading-snug">{alert.description}</p>
                        {account && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {account.account_holder_name} | {account.bank_name} | {account.location}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 items-end flex-shrink-0">
                        <Badge className={`${ACTION_STYLES[alert.action_taken]} border-0 text-xs`}>
                          {alert.action_taken === "none"
                            ? "No Action Yet"
                            : alert.action_taken.charAt(0).toUpperCase() + alert.action_taken.slice(1)}
                        </Badge>
                        {alert.action_taken !== "dismissed" && (
                          <div className="flex gap-1">
                            {alert.action_taken !== "frozen" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-blue-600 border-blue-300 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateAlertAction(realIdx, "frozen");
                                }}
                              >
                                <Snowflake className="w-3.5 h-3.5 mr-1" /> Freeze
                              </Button>
                            )}
                            {alert.action_taken !== "flagged" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-yellow-600 border-yellow-300 text-xs"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateAlertAction(realIdx, "flagged");
                                }}
                              >
                                <Flag className="w-3.5 h-3.5 mr-1" /> Flag
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-gray-400 text-xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateAlertAction(realIdx, "dismissed");
                              }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No alerts in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
