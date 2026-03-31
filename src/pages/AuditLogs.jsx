import React, { useEffect, useState, useSyncExternalStore } from "react";
import { subscribe, getAppSnapshot } from "@/lib/appState";
import {
  getAuditLogs,
  getAuditSummary,
  exportAuditLogsCSV,
  exportAuditLogsPDF,
  AUDIT_ACTION_TYPES,
} from "@/lib/auditTrail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarRange,
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
  Table2,
  UserCircle2,
} from "lucide-react";

const ALL_DATE_RANGES = "all";
const ALL_INVESTIGATORS = "__all_investigators__";
const ALL_ACTIONS = "__all_actions__";

function formatAmount(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `Rs ${numericValue.toLocaleString()}` : "Rs 0";
}

export default function AuditLogViewer() {
  const appState = useSyncExternalStore(subscribe, getAppSnapshot);
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    investigator: "",
    actionType: "",
    accountNumber: "",
    dateRange: ALL_DATE_RANGES,
  });

  const refreshLogs = () => {
    const allLogs = getAuditLogs();
    setLogs(allLogs);
    setSummary(getAuditSummary());
    applyFilters(allLogs, filters);
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  useEffect(() => {
    refreshLogs();
  }, [appState]);

  useEffect(() => {
    applyFilters(logs, filters);
  }, [filters, logs]);

  const applyFilters = (logsToFilter, filterState = filters) => {
    let result = [...logsToFilter];

    if (filterState.dateRange !== ALL_DATE_RANGES) {
      const now = new Date();
      let startDate = null;

      if (filterState.dateRange === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filterState.dateRange === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (filterState.dateRange === "month") {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      if (startDate) {
        result = result.filter((log) => new Date(log.timestamp) >= startDate);
      }
    }

    if (filterState.investigator) {
      result = result.filter((log) => log.investigator === filterState.investigator);
    }

    if (filterState.actionType) {
      result = result.filter((log) => log.actionType === filterState.actionType);
    }

    if (filterState.accountNumber) {
      result = result.filter(
        (log) =>
          log.actionDetails?.accountNumber?.includes(filterState.accountNumber) ||
          String(log.actionDetails?.accountNumbers || "").includes(filterState.accountNumber)
      );
    }

    setFilteredLogs([...result].reverse());
  };

  const handleFilterChange = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const getActionBadgeColor = (actionType) => {
    const colorMap = {
      [AUDIT_ACTION_TYPES.FREEZE_ACCOUNT]: "bg-red-100 text-red-800",
      [AUDIT_ACTION_TYPES.BATCH_FREEZE]: "bg-red-100 text-red-800",
      [AUDIT_ACTION_TYPES.UNFREEZE_ACCOUNT]: "bg-green-100 text-green-800",
      [AUDIT_ACTION_TYPES.RELEASE_AMOUNT]: "bg-blue-100 text-blue-800",
      [AUDIT_ACTION_TYPES.VERIFY_ACCOUNT]: "bg-purple-100 text-purple-800",
      [AUDIT_ACTION_TYPES.UPDATE_CLASSIFICATION]: "bg-yellow-100 text-yellow-800",
      [AUDIT_ACTION_TYPES.UPLOAD_DOCUMENTS]: "bg-orange-100 text-orange-800",
      [AUDIT_ACTION_TYPES.IMPORT_CSV]: "bg-cyan-100 text-cyan-800",
      [AUDIT_ACTION_TYPES.DOWNLOAD_REPORT]: "bg-indigo-100 text-indigo-800",
      [AUDIT_ACTION_TYPES.DOWNLOAD_FREEZE_ORDER]: "bg-indigo-100 text-indigo-800",
      [AUDIT_ACTION_TYPES.SEND_NOTIFICATION]: "bg-slate-100 text-slate-800",
    };

    return colorMap[actionType] || "bg-gray-100 text-gray-800";
  };

  const formatActionDisplay = (actionType) => {
    const displayMap = {
      [AUDIT_ACTION_TYPES.FREEZE_ACCOUNT]: "Freeze Account",
      [AUDIT_ACTION_TYPES.BATCH_FREEZE]: "Batch Freeze",
      [AUDIT_ACTION_TYPES.UNFREEZE_ACCOUNT]: "Unfreeze Account",
      [AUDIT_ACTION_TYPES.RELEASE_AMOUNT]: "Release Amount",
      [AUDIT_ACTION_TYPES.VERIFY_ACCOUNT]: "Verify Account",
      [AUDIT_ACTION_TYPES.UPDATE_CLASSIFICATION]: "Classification Update",
      [AUDIT_ACTION_TYPES.UPLOAD_DOCUMENTS]: "Upload Documents",
      [AUDIT_ACTION_TYPES.IMPORT_CSV]: "Import Dataset",
      [AUDIT_ACTION_TYPES.DOWNLOAD_REPORT]: "Download Report",
      [AUDIT_ACTION_TYPES.DOWNLOAD_FREEZE_ORDER]: "Freeze Order Download",
      [AUDIT_ACTION_TYPES.SEND_NOTIFICATION]: "Send Notification",
    };

    return displayMap[actionType] || actionType;
  };

  const getDecisionLabel = (log) => {
    switch (log.actionType) {
      case AUDIT_ACTION_TYPES.IMPORT_CSV:
        return "Dataset Imported";
      case AUDIT_ACTION_TYPES.FREEZE_ACCOUNT:
        return "Account Frozen";
      case AUDIT_ACTION_TYPES.BATCH_FREEZE:
        return "Batch Freeze Executed";
      case AUDIT_ACTION_TYPES.UNFREEZE_ACCOUNT:
        return "Account Unfrozen";
      case AUDIT_ACTION_TYPES.RELEASE_AMOUNT:
        return "Safe Balance Released";
      case AUDIT_ACTION_TYPES.VERIFY_ACCOUNT:
        return log.actionDetails?.verificationStatus === "verified"
          ? "Marked Legitimate"
          : "Verification Removed";
      case AUDIT_ACTION_TYPES.UPDATE_CLASSIFICATION:
        return "Role Updated";
      case AUDIT_ACTION_TYPES.UPLOAD_DOCUMENTS:
        return "Evidence Added";
      default:
        return "Recorded";
    }
  };

  const getActionDetailRows = (log) => {
    const details = log.actionDetails || {};

    switch (log.actionType) {
      case AUDIT_ACTION_TYPES.IMPORT_CSV:
        return [
          details.fileName ? `File: ${details.fileName}` : null,
          details.fileCount ? `Files: ${details.fileCount}` : null,
          details.transactionsCount ? `Transactions: ${details.transactionsCount}` : null,
          details.errorsCount !== undefined ? `Errors: ${details.errorsCount}` : null,
          details.sourceFiles?.length ? `Sources: ${details.sourceFiles.join(", ")}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.FREEZE_ACCOUNT:
      case AUDIT_ACTION_TYPES.UNFREEZE_ACCOUNT:
        return [
          details.accountNumber ? `Account: ${details.accountNumber}` : null,
          details.accountName ? `Name: ${details.accountName}` : null,
          details.bank ? `Bank: ${details.bank}` : null,
          details.amount !== undefined ? `Amount: ${formatAmount(details.amount)}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.BATCH_FREEZE:
        return [
          details.accountCount ? `Accounts: ${details.accountCount}` : null,
          details.bankCount ? `Banks: ${details.bankCount}` : null,
          details.amount !== undefined ? `Amount: ${formatAmount(details.amount)}` : null,
          details.highRiskCount !== undefined ? `High risk: ${details.highRiskCount}` : null,
          details.accountNumbers?.length ? `Account list: ${details.accountNumbers.join(", ")}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.RELEASE_AMOUNT:
        return [
          details.accountNumber ? `Account: ${details.accountNumber}` : null,
          details.accountName ? `Name: ${details.accountName}` : null,
          details.amountReleased !== undefined ? `Released: ${formatAmount(details.amountReleased)}` : null,
          details.totalReleasedSoFar !== undefined ? `Total released: ${formatAmount(details.totalReleasedSoFar)}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.VERIFY_ACCOUNT:
        return [
          details.accountNumber ? `Account: ${details.accountNumber}` : null,
          details.accountName ? `Name: ${details.accountName}` : null,
          details.verificationStatus ? `Status: ${details.verificationStatus}` : null,
          details.documentsCount !== undefined ? `Documents: ${details.documentsCount}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.UPDATE_CLASSIFICATION:
        return [
          details.accountNumber ? `Account: ${details.accountNumber}` : null,
          details.accountName ? `Name: ${details.accountName}` : null,
          details.previousClassification ? `From: ${details.previousClassification}` : null,
          details.newClassification ? `To: ${details.newClassification}` : null,
        ].filter(Boolean);
      case AUDIT_ACTION_TYPES.UPLOAD_DOCUMENTS:
        return [
          details.accountNumber ? `Account: ${details.accountNumber}` : null,
          details.accountName ? `Name: ${details.accountName}` : null,
          details.documentsCount !== undefined ? `New files: ${details.documentsCount}` : null,
          details.totalDocuments !== undefined ? `Total files: ${details.totalDocuments}` : null,
          details.documentNames?.length ? `Names: ${details.documentNames.join(", ")}` : null,
        ].filter(Boolean);
      default:
        return [];
    }
  };

  const getUniqueInvestigators = () => {
    const investigators = new Set();
    logs.forEach((log) => {
      if (log.investigator) {
        investigators.add(log.investigator);
      }
    });
    return Array.from(investigators).sort();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Investigator Audit Trail
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Track every freeze, verification, import, and release decision</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              This page records the operational history of the case so investigators can review who acted, when they acted,
              and what evidence or amount was affected.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={refreshLogs} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => exportAuditLogsCSV(filteredLogs)} variant="outline" size="sm">
              <Table2 className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => exportAuditLogsPDF(filteredLogs)} variant="outline" size="sm">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-blue-200 bg-blue-50 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-blue-700">Total Actions</p>
              <p className="mt-2 text-3xl font-bold text-blue-800">{summary.totalActions}</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-purple-700">Investigators</p>
              <p className="mt-2 text-3xl font-bold text-purple-800">
                {Object.keys(summary.investigatorStats || {}).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-emerald-700">Action Types</p>
              <p className="mt-2 text-3xl font-bold text-emerald-800">
                {Object.keys(summary.actionTypeStats || {}).length}
              </p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm text-amber-700">Latest Entry</p>
              <p className="mt-2 text-lg font-bold text-amber-900">
                {summary.dateRange ? new Date(summary.dateRange.end).toLocaleString() : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-slate-600" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Date Range</label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => handleFilterChange("dateRange", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DATE_RANGES}>All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Investigator</label>
            <Select
              value={filters.investigator || ALL_INVESTIGATORS}
              onValueChange={(value) =>
                handleFilterChange("investigator", value === ALL_INVESTIGATORS ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All investigators" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_INVESTIGATORS}>All</SelectItem>
                {getUniqueInvestigators().map((investigator) => (
                  <SelectItem key={investigator} value={investigator}>
                    {investigator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Action Type</label>
            <Select
              value={filters.actionType || ALL_ACTIONS}
              onValueChange={(value) =>
                handleFilterChange("actionType", value === ALL_ACTIONS ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACTIONS}>All</SelectItem>
                {Object.values(AUDIT_ACTION_TYPES).map((actionType) => (
                  <SelectItem key={actionType} value={actionType}>
                    {formatActionDisplay(actionType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Account Number</label>
            <Input
              placeholder="Search account..."
              value={filters.accountNumber}
              onChange={(event) => handleFilterChange("accountNumber", event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {filteredLogs.length ? (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getActionBadgeColor(log.actionType)}>
                        {formatActionDisplay(log.actionType)}
                      </Badge>
                      <Badge variant="outline">{getDecisionLabel(log)}</Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <CalendarRange className="h-4 w-4 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4 text-slate-400" />
                        <span>{log.investigator}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reason</p>
                    <p className="mt-1 text-sm text-slate-700">{log.reason || "N/A"}</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Action Details</p>
                    <div className="flex flex-wrap gap-2">
                      {getActionDetailRows(log).length ? (
                        getActionDetailRows(log).map((line) => (
                          <span
                            key={line}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {line}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No structured details available.</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">System Context</p>
                    <div className="space-y-2 text-sm text-slate-600">
                      <p>Timezone: {log.systemInfo?.timezone || "N/A"}</p>
                      <p>Status: {log.actionDetails?.status || "completed"}</p>
                      <p>Log ID: {log.id}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <ShieldCheck className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">No Audit Logs Found</h3>
            <p className="mt-2 text-sm text-slate-600">
              Try changing the filters or perform actions like importing data, freezing accounts, or verifying recipients.
            </p>
          </CardContent>
        </Card>
      )}

      {summary && Object.keys(summary.investigatorStats || {}).length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Actions by Investigator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(summary.investigatorStats).map(([investigator, count]) => (
                <div key={investigator} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-700">{investigator}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Actions by Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(summary.actionTypeStats).map(([actionType, count]) => (
                <div key={actionType} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span className="text-sm text-slate-700">{formatActionDisplay(actionType)}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
