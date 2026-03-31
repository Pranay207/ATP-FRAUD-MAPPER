import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Phone,
  Search,
  Send,
  Shield,
  Snowflake,
  Clock,
  Flag,
  MessageSquare,
  Zap,
  TrendingUp,
  Tag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";
import { logAuditAction, AUDIT_ACTION_TYPES } from "@/lib/auditTrail";

function buildActionPlan({ analytics, alerts, caseData }) {
  const immediateFreeze = analytics.immediateFreeze.slice(0, 3);
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").slice(0, 2);
  const identityClusters = analytics.identityLinkDetection?.linkedClusters || [];
  const reviewAccounts = analytics.reviewAccounts.slice(0, 2);
  const topRecovery = analytics.recoveryOptimizer?.freezeStrategy?.slice(0, 2) || [];
  const dominoTarget = analytics.fraudDominoCollapseSystem?.topTarget;

  return [
    {
      phase: "Immediate (0-2 hours)",
      phaseColor: "bg-red-100 text-red-700",
      priority: "critical",
      actions: [
        ...immediateFreeze.map((account, index) => ({
          id: `freeze-${account.account_number}`,
          text: `Freeze ${account.account_number} (${account.account_holder_name}) at ${account.bank_name}`,
          icon: Snowflake,
          done: account.account_status === "frozen" || index === 0,
          timeEstimate: "10 mins",
          priority: "high",
          impactScore: 95,
          actionType: "freeze_account",
          metadata: { accountNumber: account.account_number, bank: account.bank_name },
        })),
        ...criticalAlerts.map((alert) => ({
          id: `alert-${alert.id}`,
          text: alert.description,
          icon: AlertTriangle,
          done: alert.action_taken === "frozen" || alert.action_taken === "flagged",
          timeEstimate: "15 mins",
          priority: "high",
          impactScore: 90,
          actionType: "verify_alert",
        })),
        ...(dominoTarget
          ? [{
              id: `domino-${dominoTarget.account_number}`,
              text: `Prioritize domino-collapse freeze on ${dominoTarget.account_number} to block ${dominoTarget.disrupted_transactions} downstream transactions`,
              icon: Shield,
              done: false,
              timeEstimate: "20 mins",
              priority: "critical",
              impactScore: 100,
              actionType: "batch_freeze",
              metadata: { accountNumber: dominoTarget.account_number },
            }]
          : []),
      ],
    },
    {
      phase: "Short-term (2-24 hours)",
      phaseColor: "bg-orange-100 text-orange-700",
      priority: "high",
      actions: [
        ...identityClusters.slice(0, 2).map((cluster) => ({
          id: `identity-${cluster.id}`,
          text: `Pull device/IP evidence for ${cluster.member_count} linked accounts in ${cluster.label.toLowerCase()}`,
          icon: Search,
          done: false,
          timeEstimate: "30 mins",
          priority: "high",
          impactScore: 85,
          actionType: "collect_evidence",
        })),
        ...topRecovery.map((candidate) => ({
          id: `recovery-${candidate.account_number}`,
          text: `Coordinate with ${candidate.bank_name} to hold ${formatCurrency(candidate.estimated_recovery)} in ${candidate.account_number}`,
          icon: Phone,
          done: candidate.account_status === "frozen",
          timeEstimate: "45 mins",
          priority: "high",
          impactScore: 88,
          actionType: "bank_coordination",
          metadata: { amount: candidate.estimated_recovery, bank: candidate.bank_name },
        })),
        {
          id: "bank-preservation",
          text: `Issue log-preservation request to affected institutions for case ${caseData.complaint_id}`,
          icon: Send,
          done: false,
          timeEstimate: "1 hour",
          priority: "medium",
          impactScore: 80,
          actionType: "send_notification",
        },
      ],
    },
    {
      phase: "Investigation (1-7 days)",
      phaseColor: "bg-blue-100 text-blue-700",
      priority: "medium",
      actions: [
        {
          id: "network-analysis",
          text: `Expand full path analysis across ${analytics.criminalNetworks.length} detected fraud network(s)`,
          icon: Search,
          done: analytics.criminalNetworks.length === 0,
          timeEstimate: "2 hours",
          priority: "medium",
          impactScore: 75,
          actionType: "analyze",
        },
        {
          id: "mastermind-profile",
          text: `Document mastermind profile evidence for ${analytics.digitalCriminalTwin?.profiles?.length || 0} digital criminal twin cluster(s)`,
          icon: FileText,
          done: false,
          timeEstimate: "3 hours",
          priority: "medium",
          impactScore: 70,
          actionType: "document",
        },
        {
          id: "bank-chain",
          text: `Correlate cross-bank chain across ${analytics.crossBankNetwork?.summary?.institutionCount || 0} institutions`,
          icon: FileText,
          done: false,
          timeEstimate: "2.5 hours",
          priority: "medium",
          impactScore: 72,
          actionType: "analyze",
        },
      ],
    },
    {
      phase: "Recovery & Review",
      phaseColor: "bg-green-100 text-green-700",
      priority: "low",
      actions: [
        ...reviewAccounts.map((account) => ({
          id: `review-${account.account_number}`,
          text: `Review legitimacy claim for ${account.account_holder_name} and consider release of ${formatCurrency(account.releaseable_amount)}`,
          icon: CheckCircle2,
          done: account.is_verified_legitimate,
          timeEstimate: "30 mins",
          priority: "medium",
          impactScore: 65,
          actionType: "verify_account",
          metadata: { amount: account.releaseable_amount, accountNumber: account.account_number },
        })),
        {
          id: "recovery-summary",
          text: `Prepare recovery brief: ${formatCurrency(analytics.recoveryMetrics.amountRecovered)} recovered, ${formatCurrency(analytics.recoveryMetrics.amountFrozen)} frozen, ${formatCurrency(analytics.recoveryMetrics.amountStillMoving)} still moving`,
          icon: ClipboardList,
          done: false,
          timeEstimate: "1 hour",
          priority: "low",
          impactScore: 60,
          actionType: "document",
        },
      ],
    },
  ].map((phase) => ({
    ...phase,
    actions: phase.actions.filter(Boolean),
  })).filter((phase) => phase.actions.length);
}

export default function Actions() {
  const { analytics, alerts, caseData, freezeAccount, batchFreezeAccounts, verifyLegitimateAccount, releaseDisputedAmount } = useAppState();
  const initialPlan = useMemo(
    () => buildActionPlan({ analytics, alerts, caseData }),
    [analytics, alerts, caseData]
  );
  const [plan, setPlan] = useState(initialPlan);
  const [actionNotes, setActionNotes] = useState({});
  const [expandedAction, setExpandedAction] = useState(null);
  const [completionTimes, setCompletionTimes] = useState({});

  React.useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan]);

  const toggleAction = (phaseIdx, actionId, action) => {
    const isCompleting = !plan[phaseIdx].actions.find(a => a.id === actionId).done;
    
    setPlan((prev) =>
      prev.map((phase, pi) =>
        pi !== phaseIdx
          ? phase
          : {
              ...phase,
              actions: phase.actions.map((a) =>
                a.id === actionId 
                  ? { ...a, done: !a.done } 
                  : a
              ),
            }
      )
    );

    // Log to audit trail when action is completed
    if (isCompleting) {
      try {
        setCompletionTimes((prev) => ({
          ...prev,
          [actionId]: new Date().toISOString(),
        }));
        
        logAuditAction(
          AUDIT_ACTION_TYPES.DOWNLOAD_REPORT,
          {
            actionId,
            actionText: action.text,
            actionType: action.actionType,
            priority: action.priority,
            impactScore: action.impactScore,
          },
          `Investigation action completed: ${action.text.substring(0, 60)}...`
        );
      } catch (error) {
        console.warn("Could not log action completion:", error);
      }
    }
  };

  const handleActionExecution = (action, phaseIdx) => {
    // Execute direct actions like freeze
    try {
      if (action.actionType === "freeze_account" && action.metadata?.accountNumber) {
        freezeAccount(action.metadata.accountNumber);
        toggleAction(phaseIdx, action.id, action);
      } else if (action.actionType === "verify_account" && action.metadata?.accountNumber) {
        verifyLegitimateAccount(action.metadata.accountNumber, true);
        toggleAction(phaseIdx, action.id, action);
      }
    } catch (error) {
      console.error("Could not execute action:", error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700",
      low: "bg-green-100 text-green-700",
    };
    return colors[priority] || colors.low;
  };

  const getImpactBadge = (score) => {
    if (score >= 90) return { bg: "bg-red-500", text: "text-white", label: "Critical" };
    if (score >= 80) return { bg: "bg-orange-500", text: "text-white", label: "High" };
    if (score >= 70) return { bg: "bg-yellow-500", text: "text-white", label: "Medium" };
    return { bg: "bg-green-500", text: "text-white", label: "Low" };
  };

  const totalActions = plan.reduce((sum, phase) => sum + phase.actions.length, 0);
  const completedActions = plan.reduce(
    (sum, phase) => sum + phase.actions.filter((action) => action.done).length,
    0
  );
  const progressPct = totalActions ? Math.round((completedActions / totalActions) * 100) : 0;
  const totalTimeEstimate = plan.reduce(
    (sum, phase) =>
      sum +
      phase.actions.reduce((phaseSum, action) => {
        const timeStr = action.timeEstimate || "";
        const match = timeStr.match?.(/[\d.]+/);
        const hours = match ? parseFloat(match[0]) : 0;
        return phaseSum + hours;
      }, 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Investigation Action Steps</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Case {caseData.complaint_id} | Generated from the active uploaded dataset
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Progress</p>
              <p className="text-lg font-bold text-blue-600">
                {completedActions}/{totalActions} done
              </p>
            </div>
            <div className="w-14 h-14 rounded-full border-4 border-blue-200 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{progressPct}%</span>
            </div>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-6 mt-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Est. Total Time: ~{totalTimeEstimate.toFixed(1)} hours</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>{completedActions} actions completed</span>
          </div>
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-600" />
            <span>{plan.reduce((sum, p) => sum + p.actions.filter(a => a.priority === "high" || a.priority === "critical").length, 0)} high priority</span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {plan.map((phase, phaseIdx) => {
          const phaseDone = phase.actions.filter((action) => action.done).length;
          const phaseTotal = phase.actions.length;

          return (
            <motion.div
              key={phase.phase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: phaseIdx * 0.08 }}
            >
              <Card className="bg-white border border-border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge className={`${phase.phaseColor} border-0 text-sm px-3 py-1 font-semibold`}>
                        {phase.phase}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Flag className="w-3 h-3 mr-1" />
                        {phase.priority}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {phaseDone}/{phaseTotal} done
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {phase.actions.map((action) => {
                      const impactInfo = getImpactBadge(action.impactScore);
                      const isExpanded = expandedAction === action.id;
                      
                      return (
                        <div
                          key={action.id}
                          className="border border-gray-200 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedAction(isExpanded ? null : action.id)}
                            className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                              action.done
                                ? "bg-green-50"
                                : "bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                action.done ? "bg-green-500 border-green-500" : "border-gray-300"
                              }`}
                            >
                              {action.done && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </div>
                            <action.icon
                              className={`w-4 h-4 flex-shrink-0 ${
                                action.done ? "text-green-600" : "text-muted-foreground"
                              }`}
                            />
                            <span
                              className={`flex-1 text-sm leading-snug ${
                                action.done
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground font-medium"
                              }`}
                            >
                              {action.text}
                            </span>
                            
                            {/* Badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {action.timeEstimate}
                              </Badge>
                              <Badge className={`${impactInfo.bg} ${impactInfo.text} text-xs`}>
                                <TrendingUp className="w-3 h-3 mr-1" />
                                {impactInfo.label}
                              </Badge>
                            </div>
                          </button>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                              {/* Quick Actions */}
                              {action.actionType === "freeze_account" && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleActionExecution(action, phaseIdx)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Execute Freeze
                                  </Button>
                                  <Button
                                    onClick={() => toggleAction(phaseIdx, action.id, action)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Mark Complete
                                  </Button>
                                </div>
                              )}

                              {action.actionType === "verify_account" && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleActionExecution(action, phaseIdx)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Verify Account
                                  </Button>
                                  <Button
                                    onClick={() => toggleAction(phaseIdx, action.id, action)}
                                    size="sm"
                                    variant="outline"
                                  >
                                    Mark Complete
                                  </Button>
                                </div>
                              )}

                              {!["freeze_account", "verify_account"].includes(action.actionType) && (
                                <Button
                                  onClick={() => toggleAction(phaseIdx, action.id, action)}
                                  size="sm"
                                  className={action.done ? "bg-gray-500" : "bg-blue-600 hover:bg-blue-700"}
                                >
                                  {action.done ? "Mark Incomplete" : "Mark Complete"}
                                </Button>
                              )}

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground font-medium">Priority</p>
                                  <Badge className={getPriorityColor(action.priority)}>
                                    {action.priority}
                                  </Badge>
                                </div>
                                <div>
                                  <p className="text-muted-foreground font-medium">Impact Score</p>
                                  <div className="flex items-center gap-2">
                                    <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-yellow-500 to-red-500"
                                        style={{ width: `${action.impactScore}%` }}
                                      />
                                    </div>
                                    <span className="font-semibold text-foreground">{action.impactScore}%</span>
                                  </div>
                                </div>
                              </div>

                              {/* Metadata */}
                              {action.metadata && (
                                <div className="bg-white rounded p-3 space-y-2">
                                  {action.metadata.accountNumber && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Tag className="w-4 h-4 text-gray-500" />
                                      <span>Account: <span className="font-semibold">{action.metadata.accountNumber}</span></span>
                                    </div>
                                  )}
                                  {action.metadata.amount !== undefined && action.metadata.amount !== null && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Tag className="w-4 h-4 text-gray-500" />
                                      <span>Amount: <span className="font-semibold">{formatCurrency(action.metadata.amount || 0)}</span></span>
                                    </div>
                                  )}
                                  {action.metadata.bank && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Tag className="w-4 h-4 text-gray-500" />
                                      <span>Bank: <span className="font-semibold">{action.metadata.bank}</span></span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Notes Section */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-gray-600" />
                                  <label className="text-sm font-medium">Investigation Notes</label>
                                </div>
                                <Input
                                  placeholder="Add notes about this action step..."
                                  value={actionNotes[action.id] || ""}
                                  onChange={(e) => setActionNotes((prev) => ({
                                    ...prev,
                                    [action.id]: e.target.value,
                                  }))}
                                  className="text-sm"
                                />
                              </div>

                              {/* Completion Time */}
                              {action.done && completionTimes[action.id] && (
                                <div className="text-xs text-muted-foreground bg-white rounded p-2 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  Completed at {(() => {
                                    try {
                                      const dateObj = new Date(completionTimes[action.id]);
                                      return dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleString() : "just now";
                                    } catch {
                                      return "just now";
                                    }
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
