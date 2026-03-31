import React from "react";
import { Link } from "react-router-dom";
import { Bell, Shield, Star } from "lucide-react";

import DatasetManagerDialog from "@/components/data/DatasetManagerDialog";
import { useAppState } from "@/hooks/useAppState";
import apPoliceLogo from "@/assets/ap-police-logo.svg";

export default function TopBar() {
  const { alerts, caseData } = useAppState();
  const unread = alerts.filter((alert) => !alert.is_read).length;

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200">
          <Shield className="w-4 h-4 text-blue-600" />
          <div>
            <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Active Case</p>
            <p className="text-sm font-bold text-blue-700">{caseData.complaint_id}</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold text-orange-700">OTP Fraud | Investigating</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <DatasetManagerDialog
          triggerLabel="Upload Data"
          triggerVariant="outline"
          triggerSize="sm"
          triggerClassName="hidden md:inline-flex"
        />

        <Link to="/alerts" className="relative cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition-colors">
            <Bell className="w-5 h-5 text-red-600" />
          </div>
          {unread > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center text-white">
              {unread}
            </div>
          )}
        </Link>

        <div className="hidden sm:flex items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-3 py-2 shadow-sm">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold tracking-wide text-white">VG</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <img src={apPoliceLogo} alt="AP Police" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">SI Venkatesh Goud</p>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                <Star className="w-3 h-3" />
                Lead Officer
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-[11px] font-medium text-muted-foreground">Cyber Crime Cell</p>
              <span className="text-[11px] text-slate-300">|</span>
              <p className="text-[11px] text-blue-700 font-medium">AP Police</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
