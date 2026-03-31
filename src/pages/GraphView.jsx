import React, { useEffect, useRef, useState } from "react";
import {
  Link2,
  Maximize2,
  Network,
  Pause,
  Play,
  Target,
  RotateCcw,
  Upload,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  AlertTriangle,
  Snowflake,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/investigationEngine";
import { useAppState } from "@/hooks/useAppState";

const NODE_COLORS = {
  victim: "#2563eb",
  mastermind: "#dc2626",
  splitter: "#ea580c",
  mule: "#ca8a04",
  cashout: "#9333ea",
  innocent: "#16a34a",
  unknown: "#64748b",
};

const getAccountColor = (classification) => {
  const colorMap = {
    victim: { fill: "#2563eb", badge: "bg-blue-100 text-blue-700" },
    mastermind: { fill: "#dc2626", badge: "bg-red-100 text-red-700" },
    splitter: { fill: "#ea580c", badge: "bg-orange-100 text-orange-700" },
    mule: { fill: "#ca8a04", badge: "bg-amber-100 text-amber-700" },
    cashout: { fill: "#9333ea", badge: "bg-purple-100 text-purple-700" },
    innocent: { fill: "#16a34a", badge: "bg-green-100 text-green-700" },
    unknown: { fill: "#64748b", badge: "bg-slate-100 text-slate-700" },
  };

  return colorMap[classification] || colorMap.unknown;
};

const ROLE_LABELS = {
  victim: "Victim",
  mastermind: "Mastermind",
  splitter: "Splitter",
  mule: "Mule",
  cashout: "Cashout",
  innocent: "Innocent",
  unknown: "Unknown",
};

function getReviewStateMeta(account) {
  if (account?.account_status === "frozen") {
    return {
      label: "Frozen",
      fill: "#dbeafe",
      stroke: "#93c5fd",
      text: "#1d4ed8",
    };
  }

  if (account?.is_verified_legitimate) {
    return {
      label: "Verified",
      fill: "#dcfce7",
      stroke: "#86efac",
      text: "#166534",
    };
  }

  if (account?.supporting_documents?.length) {
    return {
      label: "Under Review",
      fill: "#fef3c7",
      stroke: "#fcd34d",
      text: "#92400e",
    };
  }

  if (account?.classification === "innocent") {
    return {
      label: "Innocent",
      fill: "#dcfce7",
      stroke: "#86efac",
      text: "#166534",
    };
  }

  return {
    label: "Unreviewed Suspect",
    fill: "#fee2e2",
    stroke: "#fca5a5",
    text: "#991b1b",
  };
}

function edgeKey(edge) {
  return `${edge.sender_account}:${edge.receiver_account}:${edge.transaction_id}`;
}

function shortenName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "Unknown";
  }
  return parts.slice(0, 2).join(" ");
}

function shortenReference(referenceId = "") {
  const value = String(referenceId || "");
  return value.length > 14 ? `${value.slice(0, 14)}...` : value;
}

function inferPaymentHandle(account) {
  const explicitHandle = String(account?.upi_id || "").trim();
  if (explicitHandle) {
    return explicitHandle;
  }

  const accountNumber = String(account?.account_number || "").trim();
  if (
    !accountNumber ||
    accountNumber.startsWith("CASE-") ||
    accountNumber.startsWith("ATM-") ||
    accountNumber.startsWith("MICRO-")
  ) {
    return "NA";
  }

  return /@|[A-Za-z]/.test(accountNumber) ? accountNumber : "NA";
}

function formatTransactionAmount(transaction) {
  if (transaction?.transaction_type === "low_value_activity" && Number(transaction.amount || 0) <= 0) {
    return "< Rs 500";
  }

  return formatCurrency(transaction.amount);
}

function getQuadraticPoint(start, control, end, t) {
  const x =
    (1 - t) * (1 - t) * start.x +
    2 * (1 - t) * t * control.x +
    t * t * end.x;
  const y =
    (1 - t) * (1 - t) * start.y +
    2 * (1 - t) * t * control.y +
    t * t * end.y;

  return { x, y };
}

function getQuadraticAngle(start, control, end, t) {
  const dx = 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x);
  const dy = 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function getFlowDuration(transaction) {
  if (transaction?.is_suspicious) {
    return "1.9s";
  }
  return "2.8s";
}

function getEdgeCurveMeta(transactions = []) {
  const grouped = new Map();

  transactions.forEach((transaction) => {
    if (!grouped.has(transaction.sender_account)) {
      grouped.set(transaction.sender_account, []);
    }
    grouped.get(transaction.sender_account).push(transaction);
  });

  const meta = new Map();
  grouped.forEach((items) => {
    items.forEach((transaction, index) => {
      meta.set(edgeKey(transaction), {
        siblingCount: items.length,
        siblingIndex: index,
        curveOffset: (index - (items.length - 1) / 2) * 42,
      });
    });
  });

  return meta;
}

export default function GraphView() {
  const {
    analytics,
    caseData,
    importMeta,
    importTransactionsFromCsv,
    importTransactionsFromCsvBundle,
    freezeAccount,
    updateAccountClassification,
  } = useAppState();
  const fileInputRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [timelinePos, setTimelinePos] = useState([100]);
  const [expandedDepth, setExpandedDepth] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [dominoTargetAccount, setDominoTargetAccount] = useState(null);
  const [dominoStep, setDominoStep] = useState(-1);
  const [isDominoPlaying, setIsDominoPlaying] = useState(false);
  const [classificationMessage, setClassificationMessage] = useState("");
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);
  const animationRef = useRef(null);
  const dominoAnimationRef = useRef(null);

  const transactions = analytics.transactions;
  const maxDepth = Math.max(...analytics.accounts.map((account) => account.chain_depth_level), 0);
  const visibleCount = Math.max(1, Math.ceil(transactions.length * (timelinePos[0] / 100)));
  const visibleTransactions = transactions.slice(0, visibleCount);
  const visibleAccounts = analytics.accounts.filter(
    (account) => account.chain_depth_level <= expandedDepth || account.account_number === analytics.victimAccount
  );
  const visibleAccountNumbers = new Set(visibleAccounts.map((account) => account.account_number));
  const filteredTransactions = visibleTransactions.filter(
    (transaction) =>
      visibleAccountNumbers.has(transaction.sender_account) &&
      visibleAccountNumbers.has(transaction.receiver_account)
  );

  const levels = new Map();
  visibleAccounts.forEach((account) => {
    const depth = account.chain_depth_level;
    if (!levels.has(depth)) {
      levels.set(depth, []);
    }
    levels.get(depth).push(account);
  });

  const denseGraph = visibleAccounts.length > 42 || filteredTransactions.length > 72;
  const graphTopPadding = 178;
  const graphBottomPadding = 168;
  const horizontalPadding = 110;
  const rowSpacing = denseGraph ? 94 : 108;
  const levelGap = denseGraph ? 84 : 120;
  const levelLayouts = Array.from(levels.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([depth, accountsAtDepth]) => {
      const sortedAccounts = [...accountsAtDepth].sort((left, right) => {
        if (left.account_number === analytics.victimAccount) {
          return -1;
        }
        if (right.account_number === analytics.victimAccount) {
          return 1;
        }
        return (right.risk_score || 0) - (left.risk_score || 0);
      });
      const targetPerRow = denseGraph ? 10 : 14;
      const rowCount = Math.max(1, Math.ceil(sortedAccounts.length / targetPerRow));
      const maxColumns = Math.max(1, Math.ceil(sortedAccounts.length / rowCount));

      return {
        depth,
        accounts: sortedAccounts,
        rowCount,
        maxColumns,
      };
    });
  const maxColumnsInLevel = Math.max(1, ...levelLayouts.map((layout) => layout.maxColumns));
  const horizontalSpacing =
    maxColumnsInLevel > 12 ? 110 : denseGraph ? 124 : 144;
  const width = Math.max(
    1120,
    horizontalPadding * 2 + Math.max(0, maxColumnsInLevel - 1) * horizontalSpacing
  );
  const layoutHeight = levelLayouts.reduce(
    (sum, layout) => sum + (layout.rowCount - 1) * rowSpacing + levelGap,
    0
  );
  const height = Math.max(720, graphTopPadding + graphBottomPadding + layoutHeight);
  const nodePositions = new Map();
  const edgeCurveMeta = getEdgeCurveMeta(filteredTransactions);
  const showNodeNames = visibleAccounts.length <= 34 || zoom >= 1.25;
  const showNodeMeta = visibleAccounts.length <= 16 || zoom >= 1.6;
  const showEdgeAnimations = filteredTransactions.length <= 150;
  const showEdgeLabels =
    filteredTransactions.length <= 18 || zoom >= 1.75 || Boolean(selectedNode && filteredTransactions.length <= 120);
  let currentLevelY = graphTopPadding;

  levelLayouts.forEach((layout) => {
    const rowSize = Math.ceil(layout.accounts.length / layout.rowCount);

    layout.accounts.forEach((account, index) => {
      const rowIndex = Math.floor(index / rowSize);
      const columnIndex = index % rowSize;
      const rowAccounts = layout.accounts.slice(rowIndex * rowSize, (rowIndex + 1) * rowSize);
      const spacing =
        rowAccounts.length === 1
          ? 0
          : (width - horizontalPadding * 2) / Math.max(rowAccounts.length - 1, 1);

      nodePositions.set(account.account_number, {
        x: rowAccounts.length === 1 ? width / 2 : horizontalPadding + spacing * columnIndex,
        y: currentLevelY + rowIndex * rowSpacing,
        radius:
          account.account_number === analytics.victimAccount
            ? 34
            : denseGraph && layout.accounts.length > 8
              ? 22
              : 26,
      });
    });

    currentLevelY += (layout.rowCount - 1) * rowSpacing + levelGap;
  });

  const rootNode = {
    id: "root-fraud",
    x: width / 2,
    y: 58,
    radius: 36,
  };

  const selectedAccount = analytics.accountsByNumber[selectedNode];
  const selectedRecommendation = analytics.reviewAccounts.find(
    (account) => account.account_number === selectedNode
  ) || analytics.immediateFreeze.find((account) => account.account_number === selectedNode);
  const selectedSourcePrediction = selectedNode
    ? analytics.nextTransferBySource?.[selectedNode]
    : null;
  const selectedPaymentHandle = selectedAccount
    ? inferPaymentHandle(selectedAccount)
    : "NA";
  const graphPredictions = selectedSourcePrediction?.targets || analytics.nextTransferPredictions || [];
  const selectedCriminalNetwork = selectedNode
    ? analytics.networkByAccount?.[selectedNode]
    : null;
  const dominoTarget =
    analytics.fraudDominoCollapseSystem?.rankings?.find(
      (candidate) => candidate.account_number === dominoTargetAccount
    ) ||
    analytics.fraudDominoCollapseSystem?.topTarget ||
    null;

  const dominoNodeDepths = new Map();
  const dominoEdgeDepths = new Map();

  if (dominoTarget?.account_number) {
    const queue = [{ accountNumber: dominoTarget.account_number, depth: 0 }];
    const visited = new Set([dominoTarget.account_number]);
    dominoNodeDepths.set(dominoTarget.account_number, 0);

    while (queue.length) {
      const current = queue.shift();
      filteredTransactions.forEach((transaction) => {
        if (transaction.sender_account !== current.accountNumber) {
          return;
        }

        dominoEdgeDepths.set(edgeKey(transaction), current.depth);

        if (!visited.has(transaction.receiver_account)) {
          visited.add(transaction.receiver_account);
          dominoNodeDepths.set(transaction.receiver_account, current.depth + 1);
          queue.push({
            accountNumber: transaction.receiver_account,
            depth: current.depth + 1,
          });
        }
      });
    }
  }

  const dominoMaxDepth = Math.max(...dominoNodeDepths.values(), -1);
  const highlightedEdgeKeys = new Set(
    (selectedNode
      ? filteredTransactions
          .filter(
            (transaction) =>
              transaction.sender_account === selectedNode ||
              transaction.receiver_account === selectedNode
          )
          .sort((left, right) => Number(right.amount || 0) - Number(left.amount || 0))
          .slice(0, denseGraph ? 14 : 28)
          .map((transaction) => edgeKey(transaction))
      : [])
  );

  const resetGraphPlayback = () => {
    setExpandedDepth(2);
    setSelectedNode(null);
    setTimelinePos([100]);
    setIsPlaying(false);
    setIsDominoPlaying(false);
    setDominoStep(-1);
    setIsDetailsSheetOpen(false);
  };

  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) {
      return;
    }

    try {
      const csvFiles = selectedFiles.filter((file) => file.name.toLowerCase().endsWith(".csv"));

      if (!csvFiles.length) {
        setImportMessage("Please select one or more CSV files for the testing dataset.");
        return;
      }

      let result;
      let successMessage;

      if (csvFiles.length === 1) {
        const [file] = csvFiles;
        const text = await file.text();
        result = importTransactionsFromCsv(text, file.name);
        successMessage = `Imported ${result.importedTransactions} transactions from ${file.name} as a separate testing dataset.`;
      } else {
        const datasetFiles = await Promise.all(
          csvFiles.map(async (file) => ({
            fileName: file.name,
            csvText: await file.text(),
          }))
        );

        result = importTransactionsFromCsvBundle(
          datasetFiles,
          `Integrated testing dataset (${csvFiles.length} files)`
        );
        successMessage = `Imported ${result.importedTransactions} transactions from ${csvFiles.length} CSV files as a separate testing dataset.`;
      }

      resetGraphPlayback();
      setImportMessage(
        result.importErrors.length
          ? `${successMessage} ${result.importErrors.length} row warning(s) were skipped.`
          : successMessage
      );
    } catch (error) {
      setImportMessage(error.message || "Unable to import CSV.");
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        window.clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return undefined;
    }

    animationRef.current = window.setInterval(() => {
      setTimelinePos((previous) => {
        const next = previous[0] + 3;
        if (next >= 100) {
          setIsPlaying(false);
          return [100];
        }
        return [next];
      });
    }, 250);

    return () => {
      if (animationRef.current) {
        window.clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (!dominoTarget?.account_number && analytics.fraudDominoCollapseSystem?.topTarget?.account_number) {
      setDominoTargetAccount(analytics.fraudDominoCollapseSystem.topTarget.account_number);
    }
  }, [analytics.fraudDominoCollapseSystem, dominoTarget]);

  useEffect(() => {
    if (!isDominoPlaying) {
      if (dominoAnimationRef.current) {
        window.clearInterval(dominoAnimationRef.current);
        dominoAnimationRef.current = null;
      }
      return undefined;
    }

    dominoAnimationRef.current = window.setInterval(() => {
      setDominoStep((current) => {
        if (current >= dominoMaxDepth + 1) {
          setIsDominoPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 480);

    return () => {
      if (dominoAnimationRef.current) {
        window.clearInterval(dominoAnimationRef.current);
        dominoAnimationRef.current = null;
      }
    };
  }, [dominoMaxDepth, isDominoPlaying]);

  const handleNodeClick = (accountNumber) => {
    const account = analytics.accountsByNumber[accountNumber];
    if (!account) {
      return;
    }

    setSelectedNode(accountNumber);
    setIsDetailsSheetOpen(true);
    setExpandedDepth((currentDepth) => Math.min(maxDepth, Math.max(currentDepth, account.chain_depth_level + 1)));
  };

  const handleClassifyAccount = (newClassification) => {
    if (!selectedNode || !selectedAccount) {
      return;
    }

    const classificationMap = {
      innocent: { value: "innocent", label: "Innocent" },
      suspect: { value: "unknown", label: "Suspect" },
    };
    const nextClassification = classificationMap[newClassification];
    if (!nextClassification) {
      return;
    }

    const classificationName = nextClassification.label;
    updateAccountClassification(selectedNode, nextClassification.value);
    if (newClassification === "suspect") {
      if (selectedAccount.account_status !== "frozen") {
        freezeAccount(selectedNode);
      }
      setClassificationMessage(`${classificationName} account frozen`);
      setTimeout(() => setClassificationMessage(""), 3000);
      return;
    }
    setClassificationMessage(`✓ Marked as ${classificationName}`);
    setTimeout(() => setClassificationMessage(""), 3000);
  };

  const handleFreezeSelectedAccount = () => {
    if (!selectedNode || !selectedAccount) {
      return;
    }

    freezeAccount(selectedNode);
    setClassificationMessage("Account frozen");
    setTimeout(() => setClassificationMessage(""), 3000);
  };

  const playDominoCollapse = () => {
    if (!dominoTarget?.account_number) {
      return;
    }

    setSelectedNode(dominoTarget.account_number);
    setExpandedDepth(maxDepth);
    setTimelinePos([100]);
    setDominoStep(-1);
    setIsDominoPlaying(true);
  };

  const resetDominoCollapse = () => {
    setIsDominoPlaying(false);
    setDominoStep(-1);
  };

  return (
    <>
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-border p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-600" />
            Interactive Transaction Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Root event = initial fraud hit. Click nodes to expand deeper layers and inspect risk,
            legitimacy, and disputed flow.
          </p>
          {importMeta.fileName && (
            <div className="mt-1 space-y-1">
              <p className="text-xs text-blue-700">
                {importMeta.origin === "bundled"
                  ? `Bundled testing dataset active: ${importMeta.fileName}. This stays separate from the base demo database.`
                  : `Latest import: ${importMeta.fileName} at ${new Date(importMeta.importedAt).toLocaleString()}.`}
              </p>
              {importMeta.sourceFiles?.length > 0 && (
                <p className="text-[11px] text-slate-600">
                  Source files: {importMeta.sourceFiles.join(" | ")}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            Upload CSVs
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border" onClick={() => setZoom((value) => Math.max(0.5, value - 0.15))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-muted-foreground w-14 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-border"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {importMessage && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {importMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 bg-white border border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <CardTitle className="text-base font-bold">
                Money Trail Canvas
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Visible layers: {expandedDepth + 1}
                </Badge>
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  {filteredTransactions.filter((transaction) => transaction.is_suspicious).length} suspicious edges
                </Badge>
                {dominoTarget && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                    Freeze first: {dominoTarget.account_number}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {denseGraph && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Dense dataset detected. Scroll or zoom in to inspect individual labels. Selecting a node will reveal the
                related edge labels.
              </div>
            )}
            <div
              className="rounded-2xl border border-border bg-slate-50 overflow-auto cursor-grab active:cursor-grabbing"
              onMouseDown={(event) => setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y })}
              onMouseMove={(event) => {
                if (dragStart) {
                  setPan({
                    x: event.clientX - dragStart.x,
                    y: event.clientY - dragStart.y,
                  });
                }
              }}
              onMouseUp={() => setDragStart(null)}
              onMouseLeave={() => setDragStart(null)}
            >
              <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
                <defs>
                  <marker
                    id="graph-arrow"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L0,8 L12,4 z" fill="#64748b" />
                  </marker>
                  <marker
                    id="graph-arrow-alert"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L0,8 L12,4 z" fill="#dc2626" />
                  </marker>
                  <marker
                    id="graph-arrow-watch"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L0,8 L12,4 z" fill="#f59e0b" />
                  </marker>
                  <marker
                    id="graph-arrow-root"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L0,8 L12,4 z" fill="#2563eb" />
                  </marker>
                  <marker
                    id="graph-arrow-innocent"
                    markerWidth="14"
                    markerHeight="14"
                    refX="11"
                    refY="4"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <path d="M0,0 L0,8 L12,4 z" fill="#22c55e" />
                  </marker>
                  <filter id="edge-pill-shadow" x="-20%" y="-50%" width="140%" height="220%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.12" />
                  </filter>
                </defs>

                <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                  {analytics.victimAccount && nodePositions.has(analytics.victimAccount) && (
                    <>
                      {(() => {
                        const rootPath = `M ${rootNode.x} ${rootNode.y + rootNode.radius} Q ${rootNode.x} ${(rootNode.y + nodePositions.get(analytics.victimAccount).y) / 2} ${nodePositions.get(analytics.victimAccount).x} ${nodePositions.get(analytics.victimAccount).y - nodePositions.get(analytics.victimAccount).radius}`;

                        return (
                          <>
                            <path
                              d={rootPath}
                              stroke="#93c5fd"
                              strokeWidth="8"
                              strokeLinecap="round"
                              fill="none"
                              opacity="0.25"
                            />
                            <path
                              d={rootPath}
                              stroke="#2563eb"
                              strokeWidth="3"
                              fill="none"
                              markerEnd="url(#graph-arrow-root)"
                              strokeDasharray="8 10"
                            >
                              <animate
                                attributeName="stroke-dashoffset"
                                values="0;-54"
                                dur="2.2s"
                                repeatCount="indefinite"
                              />
                            </path>
                            <circle r="4.5" fill="#2563eb" opacity="0.9">
                              <animateMotion
                                dur="2.2s"
                                repeatCount="indefinite"
                                path={rootPath}
                              />
                            </circle>
                          </>
                        );
                      })()}
                      <g filter="url(#edge-pill-shadow)">
                        <rect
                          x={rootNode.x - 72}
                          y={(rootNode.y + nodePositions.get(analytics.victimAccount).y) / 2 - 26}
                          width="144"
                          height="36"
                          rx="12"
                          fill="white"
                          stroke="#93c5fd"
                        />
                      </g>
                      <text
                        x={rootNode.x}
                        y={(rootNode.y + nodePositions.get(analytics.victimAccount).y) / 2 - 4}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#1d4ed8"
                        fontWeight="700"
                      >
                        Initial Fraud Flow
                      </text>
                      <text
                        x={rootNode.x}
                        y={(rootNode.y + nodePositions.get(analytics.victimAccount).y) / 2 + 10}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#1e40af"
                        fontWeight="700"
                      >
                        {formatCurrency(analytics.rootAmount)}
                      </text>
                    </>
                  )}

                  {filteredTransactions.map((transaction) => {
                    const source = nodePositions.get(transaction.sender_account);
                    const target = nodePositions.get(transaction.receiver_account);

                    if (!source || !target) {
                      return null;
                    }

                    const senderAccount = analytics.accountsByNumber[transaction.sender_account];
                    const receiverAccount = analytics.accountsByNumber[transaction.receiver_account];
                    const senderInnocent = senderAccount?.classification === "innocent";
                    const receiverInnocent = receiverAccount?.classification === "innocent";
                    const bothInnocent = senderInnocent && receiverInnocent;
                    const toInnocent = receiverInnocent && !senderInnocent;

                    const curveMeta = edgeCurveMeta.get(edgeKey(transaction)) || {
                      curveOffset: 0,
                    };
                    const midX = (source.x + target.x) / 2;
                    const midY = (source.y + target.y) / 2;
                    const dx = target.x - source.x;
                    const dy = target.y - source.y;
                    const distance = Math.max(Math.hypot(dx, dy), 1);
                    const normalX = -dy / distance;
                    const normalY = dx / distance;
                    const controlX = midX + normalX * curveMeta.curveOffset;
                    const controlY = midY + normalY * curveMeta.curveOffset;
                    const labelX = 0.25 * source.x + 0.5 * controlX + 0.25 * target.x;
                    const labelY = 0.25 * source.y + 0.5 * controlY + 0.25 * target.y;
                    const flowMarkerPoint = getQuadraticPoint(
                      { x: source.x, y: source.y },
                      { x: controlX, y: controlY },
                      { x: target.x, y: target.y },
                      0.62
                    );
                    const flowMarkerAngle = getQuadraticAngle(
                      { x: source.x, y: source.y },
                      { x: controlX, y: controlY },
                      { x: target.x, y: target.y },
                      0.62
                    );
                    const pathData = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;
                    const isDominoImpacted = dominoEdgeDepths.has(edgeKey(transaction));
                    const isCollapsed =
                      dominoStep >= 1 &&
                      dominoEdgeDepths.get(edgeKey(transaction)) <= dominoStep - 1;
                    const isPrimed =
                      isDominoImpacted && (dominoStep === -1 || dominoStep === 0);
                    const isSelectedEdge =
                      selectedNode &&
                      (transaction.sender_account === selectedNode ||
                        transaction.receiver_account === selectedNode);
                    const shouldShowEdgeLabel =
                      showEdgeLabels &&
                      (!selectedNode ||
                        filteredTransactions.length <= 24 ||
                        (isSelectedEdge && highlightedEdgeKeys.has(edgeKey(transaction))));
                    
                    // Color based on innocence
                    const stroke = isCollapsed
                      ? "#dc2626"
                      : isPrimed
                        ? "#f59e0b"
                        : bothInnocent
                          ? "#22c55e"
                          : toInnocent
                            ? "#10b981"
                            : transaction.is_suspicious
                              ? "#dc2626"
                              : "#64748b";
                    
                    const markerEnd = isCollapsed
                      ? "url(#graph-arrow-alert)"
                      : isPrimed
                        ? "url(#graph-arrow-watch)"
                        : bothInnocent || toInnocent
                          ? "url(#graph-arrow-innocent)"
                          : transaction.is_suspicious
                            ? "url(#graph-arrow-alert)"
                            : "url(#graph-arrow)";
                    
                    const pillStroke = isCollapsed
                      ? "#fca5a5"
                      : isPrimed
                        ? "#fcd34d"
                        : bothInnocent || toInnocent
                          ? "#86efac"
                          : transaction.is_suspicious
                            ? "#fecaca"
                            : "#cbd5e1";
                    
                    const pillFill = isCollapsed
                      ? "#fff1f2"
                      : isPrimed
                        ? "#fffbeb"
                        : bothInnocent || toInnocent
                          ? "#dcfce7"
                          : "white";
                    const timeLabel = new Date(transaction.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <g key={edgeKey(transaction)}>
                        <path
                          d={pathData}
                          stroke={isCollapsed ? "#fca5a5" : isPrimed ? "#fed7aa" : bothInnocent || toInnocent ? "#86efac" : transaction.is_suspicious ? "#fecaca" : "#cbd5e1"}
                          strokeWidth={isCollapsed ? 8 : transaction.is_suspicious ? 6 : 5}
                          fill="none"
                          opacity={0.35}
                          strokeLinecap="round"
                        />
                        <path
                          d={pathData}
                          stroke={stroke}
                          strokeWidth={isCollapsed ? 3.5 : bothInnocent || toInnocent ? 2.2 : transaction.is_suspicious ? 2.5 : 1.6}
                          strokeDasharray={isCollapsed ? "10 5" : bothInnocent || toInnocent ? "" : transaction.is_suspicious ? "" : "6 4"}
                          opacity={isCollapsed ? 0.55 : 1}
                          fill="none"
                          markerEnd={markerEnd}
                          strokeLinecap="round"
                        >
                          {showEdgeAnimations && (
                            <animate
                              attributeName="stroke-dashoffset"
                              values="0;-48"
                              dur={getFlowDuration(transaction)}
                              repeatCount="indefinite"
                            />
                          )}
                        </path>
                        {!isCollapsed && showEdgeAnimations && (
                          <>
                            <circle
                              r={transaction.is_suspicious ? "4.2" : bothInnocent || toInnocent ? "3.5" : "3.2"}
                              fill={stroke}
                              opacity="0.92"
                            >
                              <animateMotion
                                dur={getFlowDuration(transaction)}
                                repeatCount="indefinite"
                                path={pathData}
                                begin="0s"
                              />
                            </circle>
                            <circle
                              r={transaction.is_suspicious ? "3.3" : bothInnocent || toInnocent ? "2.8" : "2.6"}
                              fill={stroke}
                              opacity="0.55"
                            >
                              <animateMotion
                                dur={getFlowDuration(transaction)}
                                repeatCount="indefinite"
                                path={pathData}
                                begin={transaction.is_suspicious ? "0.55s" : "0.9s"}
                              />
                            </circle>
                          </>
                        )}
                        <g
                          transform={`translate(${flowMarkerPoint.x} ${flowMarkerPoint.y}) rotate(${flowMarkerAngle})`}
                          opacity={isCollapsed ? 0.55 : 1}
                        >
                          <circle
                            cx="0"
                            cy="0"
                            r={shouldShowEdgeLabel ? "10" : "7"}
                            fill={isCollapsed ? "#fff1f2" : isPrimed ? "#fffbeb" : "white"}
                            stroke={pillStroke}
                          />
                          <path d="M-3 -4 L4 0 L-3 4 Z" fill={stroke} />
                        </g>
                        {shouldShowEdgeLabel && (
                          <>
                            <g filter="url(#edge-pill-shadow)">
                              <rect
                                x={labelX - 88}
                                y={labelY - 28}
                                width="176"
                                height="44"
                                rx="12"
                                fill={pillFill}
                                stroke={pillStroke}
                              />
                            </g>
                            <text x={labelX} y={labelY - 9} textAnchor="middle" fontSize="10.5" fill={stroke} fontWeight="700">
                              {formatTransactionAmount(transaction)}
                            </text>
                            <rect
                              x={node.x - 41}
                              y={node.y + node.radius + 40}
                              width="82"
                              height="12"
                              rx="6"
                              fill={reviewState.fill}
                              stroke="none"
                            />
                            <text x={node.x} y={node.y + node.radius + 48} textAnchor="middle" fontSize="8" fill={reviewState.text} fontWeight="600">
                              {reviewState.label}
                            </text>
                            <text x={labelX} y={labelY + 4} textAnchor="middle" fontSize="8.5" fill="#475569">
                              {timeLabel}
                            </text>
                            <text x={labelX} y={labelY + 16} textAnchor="middle" fontSize="8" fill="#64748b">
                              {shortenReference(transaction.reference_id)}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  <g>
                    <circle cx={rootNode.x} cy={rootNode.y} r={rootNode.radius} fill="#dbeafe" stroke="#2563eb" strokeWidth="3" />
                    <circle cx={rootNode.x} cy={rootNode.y} r={rootNode.radius - 11} fill="#bfdbfe" />
                    <text x={rootNode.x} y={rootNode.y - 2} textAnchor="middle" fontSize="12" fill="#1d4ed8" fontWeight="700">
                      FRAUD ROOT
                    </text>
                    <text x={rootNode.x} y={rootNode.y + 14} textAnchor="middle" fontSize="10" fill="#1e293b">
                      {formatCurrency(analytics.rootAmount)}
                    </text>
                  </g>

                  {visibleAccounts.map((account) => {
                    const node = nodePositions.get(account.account_number);
                    const isSelected = selectedNode === account.account_number;
                    const colorInfo = getAccountColor(account.classification);
                    const reviewState = getReviewStateMeta(account);
                    const isInnocent = reviewState.label === "Innocent";
                    const fill = colorInfo.fill;
                    const dominoDepth = dominoNodeDepths.get(account.account_number);
                    const isDominoTarget = dominoTarget?.account_number === account.account_number;
                    const isKeyNode =
                      isSelected ||
                      isDominoTarget ||
                      account.account_number === analytics.victimAccount;
                    const shouldShowNodeName = isKeyNode || showNodeNames;
                    const shouldShowNodeDetails = isKeyNode || showNodeMeta;
                    const isCollapsed =
                      dominoStep >= 1 &&
                      dominoDepth !== undefined &&
                      dominoDepth <= dominoStep - 1;
                    const isPrimed =
                      dominoDepth !== undefined && (dominoStep === -1 || dominoStep === 0);
                    const outerFill = isCollapsed
                      ? "#e2e8f0"
                      : isPrimed
                        ? "#fef3c7"
                        : `${fill}22`;
                    const outerStroke = isCollapsed
                      ? "#dc2626"
                      : isPrimed
                        ? "#f59e0b"
                        : fill;
                    const coreFill = isCollapsed ? "#cbd5e1" : fill;

                    return (
                      <g
                        key={account.account_number}
                        onClick={() => handleNodeClick(account.account_number)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={node.radius + (isSelected ? 6 : 0)}
                          fill={outerFill}
                          stroke={outerStroke}
                          strokeWidth={isSelected ? 3.2 : 2}
                          opacity={isCollapsed ? 0.85 : 1}
                        />
                        <circle cx={node.x} cy={node.y} r={node.radius * 0.46} fill={coreFill} />
                        {isDominoTarget && dominoStep === 0 && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 12}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="4"
                            strokeDasharray="10 6"
                            opacity="0.85"
                          />
                        )}
                        {isCollapsed && (
                          <>
                            <line
                              x1={node.x - 16}
                              y1={node.y - 16}
                              x2={node.x + 16}
                              y2={node.y + 16}
                              stroke="#dc2626"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                            <line
                              x1={node.x + 16}
                              y1={node.y - 16}
                              x2={node.x - 16}
                              y2={node.y + 16}
                              stroke="#dc2626"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </>
                        )}
                        {shouldShowNodeName && (
                          <text x={node.x} y={node.y + node.radius + 16} textAnchor="middle" fontSize="11" fill="#1e293b" fontWeight="700">
                            {shortenName(account.account_holder_name)}
                          </text>
                        )}
                        {shouldShowNodeDetails && (
                          <>
                            <text x={node.x} y={node.y + node.radius + 30} textAnchor="middle" fontSize="9" fill={fill}>
                              {isCollapsed ? "Blocked" : ROLE_LABELS[account.classification] || ROLE_LABELS.unknown}
                            </text>
                            <rect
                              x={node.x - 46}
                              y={node.y + node.radius + 36}
                              width="92"
                              height="18"
                              rx="9"
                              fill={reviewState.fill}
                              stroke={reviewState.stroke}
                            />
                            <text x={node.x} y={node.y + node.radius + 48} textAnchor="middle" fontSize="8" fill={reviewState.text} fontWeight="600">
                              {isInnocent ? "✓ Innocent" : "⚠ Suspicious"}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Timeline Replay
                </p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl font-semibold"
                    onClick={() => setIsPlaying((value) => !value)}
                  >
                    {isPlaying ? <><Pause className="w-4 h-4 mr-1" /> Pause</> : <><Play className="w-4 h-4 mr-1" /> Play</>}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => {
                      setTimelinePos([0]);
                      setIsPlaying(false);
                    }}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={timelinePos}
                    onValueChange={setTimelinePos}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold text-foreground w-24 text-right whitespace-nowrap">
                    {visibleCount} / {transactions.length} transfers
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Domino Replay
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={playDominoCollapse} disabled={!dominoTarget}>
                    {isDominoPlaying ? "Running..." : "Play Domino"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetDominoCollapse}>
                    Reset Domino
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setExpandedDepth((value) => Math.max(0, value - 1))}>
                    Collapse
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setExpandedDepth((value) => Math.min(maxDepth, value + 1))}>
                    Expand
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {dominoTarget
                    ? `Recommended first freeze: ${dominoTarget.account_number}. Play to watch the downstream fraud chain collapse.`
                    : "No domino-collapse target is available yet."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Link2 className="w-4 h-4 text-slate-600" />
                Account Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-700" />
                  <span className="text-sm font-bold text-green-800">Innocent Account</span>
                </div>
                <p className="text-[11px] text-green-700">Verified legitimate recipient. Safe to release funds.</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-700" />
                  <span className="text-sm font-bold text-red-800">Suspicious Account</span>
                </div>
                <p className="text-[11px] text-red-700">Fraud participant. Requires recovery freeze action.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-red-600" />
                Domino Effect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dominoTarget ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-red-100 text-red-700 border-0 text-[11px]">
                      Collapse {dominoTarget.collapse_score}%
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-700 border-0 text-[11px]">
                      {dominoTarget.disrupted_transactions} txn blocked
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    Freeze {dominoTarget.account_holder_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {dominoTarget.account_number} | {formatCurrency(dominoTarget.downstream_amount_blocked)} downstream movement at risk
                  </p>
                  <p className="text-[11px] text-slate-700 mt-2">
                    {dominoStep < 0
                      ? "Press Play Domino to stage the collapse."
                      : dominoStep === 0
                        ? "Target locked. Freeze order issued."
                        : `Collapse wave ${Math.min(dominoStep, dominoMaxDepth + 1)} is propagating through the graph.`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No domino-collapse target is available yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">
                {selectedAccount ? "Account Details" : "Tap a Node"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAccount ? (
                <div className="space-y-3">
                  <div
                    className="p-3 rounded-xl border-2"
                    style={{
                      borderColor: `${NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown}55`,
                      background: `${NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown}12`,
                    }}
                  >
                    <p className="text-base font-bold">{selectedAccount.account_holder_name}</p>
                    <Badge
                      className="mt-1 text-[11px] font-bold border-0 text-white"
                      style={{ background: NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown }}
                    >
                      {ROLE_LABELS[selectedAccount.classification] || ROLE_LABELS.unknown}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {[
                      ["Name", selectedAccount.account_holder_name || "NA"],
                      ["Phone No", selectedAccount.mobile_number || "NA"],
                      ["UPI / Wallet", selectedPaymentHandle],
                      ["Bank", selectedAccount.bank_name],
                      ["Account No", selectedAccount.account_number],
                      ["Balance", formatCurrency(selectedAccount.current_balance)],
                      ["Risk", `${selectedAccount.risk_score}/100`],
                      ["Legitimacy", `${selectedAccount.trust_score}/100`],
                      ["Hold Amount", formatCurrency(selectedAccount.disputed_amount)],
                      ["Releaseable", formatCurrency(selectedAccount.releaseable_amount)],
                      ["Chain Depth", `Level ${selectedAccount.chain_depth_level}`],
                      ["Status", selectedAccount.account_status.toUpperCase()],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between items-start gap-2">
                        <span className="text-xs text-muted-foreground flex-shrink-0">{label}</span>
                        <span className="text-xs font-semibold text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Explanation
                    </p>
                    {selectedAccount.explanation.map((line) => (
                      <p key={line} className="text-xs text-foreground leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>

                  {selectedRecommendation && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                        Recommendation
                      </p>
                      <p className="text-sm text-amber-900 mt-1">
                        {selectedRecommendation.trust_score >= 65
                          ? `Hold ${formatCurrency(selectedRecommendation.disputed_amount)} and allow review of ${formatCurrency(selectedRecommendation.releaseable_amount)}.`
                          : `Prioritize freeze with disputed hold of ${formatCurrency(selectedRecommendation.disputed_amount)}.`}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setIsDetailsSheetOpen(true)}
                  >
                    Open Full Details
                  </Button>

                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
                      Quick Actions
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={selectedAccount.classification === "innocent" ? "default" : "outline"}
                        size="sm"
                        className={selectedAccount.classification === "innocent" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-300"}
                        onClick={() => handleClassifyAccount("innocent")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Innocent
                      </Button>
                      <Button
                        variant={selectedAccount.classification !== "innocent" ? "default" : "outline"}
                        size="sm"
                        className={selectedAccount.classification !== "innocent" ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-300"}
                        onClick={() => handleClassifyAccount("suspect")}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                        Suspect
                      </Button>
                      <Button
                        variant={selectedAccount.account_status === "frozen" ? "default" : "outline"}
                        size="sm"
                        className={selectedAccount.account_status === "frozen" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-300"}
                        onClick={handleFreezeSelectedAccount}
                        disabled={selectedAccount.account_status === "frozen"}
                      >
                        <Snowflake className="w-3.5 h-3.5 mr-1.5" />
                        {selectedAccount.account_status === "frozen" ? "Frozen" : "Freeze"}
                      </Button>
                    </div>
                    {classificationMessage && (
                      <p className="text-xs text-green-700 font-semibold mt-2 text-center">
                        {classificationMessage}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-3">
                    <Network className="w-7 h-7 text-blue-400" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Click any node to expand the graph and inspect the account.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Graph Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Role Colors
                </p>
                <div className="space-y-2">
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2.5">
                      <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: NODE_COLORS[key] }} />
                      <span className="text-xs text-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  Review Status
                </p>
                <div className="space-y-2">
                  {[
                    { label: "Frozen", fill: "#dbeafe", stroke: "#93c5fd", text: "#1d4ed8" },
                    { label: "Verified", fill: "#dcfce7", stroke: "#86efac", text: "#166534" },
                    { label: "Under Review", fill: "#fef3c7", stroke: "#fcd34d", text: "#92400e" },
                    { label: "Unreviewed Suspect", fill: "#fee2e2", stroke: "#fca5a5", text: "#991b1b" },
                  ].map((status) => (
                    <div key={status.label} className="flex items-center gap-2.5">
                      <div
                        className="min-w-[86px] rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold"
                        style={{
                          background: status.fill,
                          borderColor: status.stroke,
                          color: status.text,
                        }}
                      >
                        {status.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">
                  Role colors identify account type. The small pill under each node shows review or freeze status.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Red edges indicate suspicious propagation. Clicking a node expands one more downstream layer.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-600" />
                {selectedCriminalNetwork ? selectedCriminalNetwork.name : "Fraud Networks"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedCriminalNetwork ? (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className="bg-violet-100 text-violet-700 border-0 text-[11px]">
                      {selectedCriminalNetwork.label}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 border-0 text-[11px]">
                      Max risk {selectedCriminalNetwork.highest_risk_score}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-700 font-semibold">
                    {selectedCriminalNetwork.path_preview}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {selectedCriminalNetwork.member_count} linked accounts | {selectedCriminalNetwork.transaction_count} internal transfers
                  </p>
                  {selectedCriminalNetwork.key_indicators.slice(0, 2).map((line) => (
                    <p key={line} className="text-[11px] text-slate-700 mt-1">
                      {line}
                    </p>
                  ))}
                </div>
              ) : analytics.criminalNetworks?.length ? (
                analytics.criminalNetworks.slice(0, 3).map((network) => (
                  <div
                    key={network.id}
                    className="rounded-xl border border-violet-100 bg-violet-50 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{network.name}</p>
                      <Badge className="bg-violet-100 text-violet-700 border-0 text-[11px]">
                        {network.member_count} accounts
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold">
                      {network.path_preview}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {network.label}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No strong criminal network cluster is available yet. Import more linked transaction history to improve network grouping.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                {selectedSourcePrediction ? "Fraud Prediction Model" : "Fraud Prediction Model"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {graphPredictions.length ? (
                graphPredictions.slice(0, 3).map((target) => {
                  const probability =
                    target.probability || Math.min(95, Math.round(target.weightedScore || 0));

                  return (
                    <div
                      key={target.account_number}
                      className="rounded-xl border border-blue-100 bg-blue-50 p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-semibold">{target.account_holder_name}</p>
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[11px]">
                          {probability}% likely
                        </Badge>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-800">
                        Next possible suspicious receiver
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {target.bank_name} | {target.account_number}
                      </p>
                      <p className="text-[11px] text-slate-700 mt-1">
                        Likely amount {formatCurrency(target.predicted_amount || 0)}
                      </p>
                      {(target.reasons || []).slice(0, 2).map((line) => (
                        <p key={line} className="text-[11px] text-slate-700 mt-1">
                          {line}
                        </p>
                      ))}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No strong suspicious-account forecast yet. Import more recent transactions to improve the model.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>

    <Sheet open={isDetailsSheetOpen && Boolean(selectedAccount)} onOpenChange={setIsDetailsSheetOpen}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {selectedAccount && (
          <>
            <SheetHeader>
              <SheetTitle>{selectedAccount.account_holder_name}</SheetTitle>
              <SheetDescription>
                Full node profile for {selectedAccount.account_number}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4">
              <div
                className="rounded-2xl border-2 p-4"
                style={{
                  borderColor: `${NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown}55`,
                  background: `${NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown}12`,
                }}
              >
                <p className="text-lg font-bold text-slate-900">{selectedAccount.account_holder_name || "NA"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    className="text-[11px] font-bold border-0 text-white"
                    style={{ background: NODE_COLORS[selectedAccount.classification] || NODE_COLORS.unknown }}
                  >
                    {ROLE_LABELS[selectedAccount.classification] || ROLE_LABELS.unknown}
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    {selectedAccount.account_status?.toUpperCase() || "NA"}
                  </Badge>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Identity Details
                </p>
                <div className="space-y-3">
                  {[
                    ["Name", selectedAccount.account_holder_name || "NA"],
                    ["Phone No", selectedAccount.mobile_number || "NA"],
                    ["UPI / Wallet", selectedPaymentHandle],
                    ["Bank", selectedAccount.bank_name || "NA"],
                    ["Account No", selectedAccount.account_number || "NA"],
                    ["Email", selectedAccount.email || "NA"],
                    ["Location", selectedAccount.location || "NA"],
                    ["Device ID", selectedAccount.device_id || "NA"],
                    ["IP Address", selectedAccount.ip_address || "NA"],
                    ["KYC", selectedAccount.kyc_id_masked || "NA"],
                    ["Created On", selectedAccount.account_creation_date || "NA"],
                    ["Last Login", selectedAccount.login_timestamp ? new Date(selectedAccount.login_timestamp).toLocaleString() : "NA"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-right text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Investigation Metrics
                </p>
                <div className="space-y-3">
                  {[
                    ["Balance", formatCurrency(selectedAccount.current_balance)],
                    ["Risk", `${selectedAccount.risk_score}/100`],
                    ["Legitimacy", `${selectedAccount.trust_score}/100`],
                    ["Hold Amount", formatCurrency(selectedAccount.disputed_amount)],
                    ["Releaseable", formatCurrency(selectedAccount.releaseable_amount)],
                    ["Chain Depth", `Level ${selectedAccount.chain_depth_level}`],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-start gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-semibold text-right text-slate-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Explanation
                </p>
                <div className="space-y-2">
                  {(selectedAccount.explanation || []).map((line) => (
                    <p key={line} className="text-sm text-slate-700 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>

              {selectedRecommendation && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800 mb-2">
                    Recommendation
                  </p>
                  <p className="text-sm text-amber-900">
                    {selectedRecommendation.trust_score >= 65
                      ? `Hold ${formatCurrency(selectedRecommendation.disputed_amount)} and allow review of ${formatCurrency(selectedRecommendation.releaseable_amount)}.`
                      : `Prioritize freeze with disputed hold of ${formatCurrency(selectedRecommendation.disputed_amount)}.`}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
                  Node Actions
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedAccount.classification === "innocent" ? "default" : "outline"}
                    size="sm"
                    className={selectedAccount.classification === "innocent" ? "bg-green-600 hover:bg-green-700 text-white" : "border-green-300"}
                    onClick={() => handleClassifyAccount("innocent")}
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    Innocent
                  </Button>
                  <Button
                    variant={selectedAccount.classification !== "innocent" ? "default" : "outline"}
                    size="sm"
                    className={selectedAccount.classification !== "innocent" ? "bg-red-600 hover:bg-red-700 text-white" : "border-red-300"}
                    onClick={() => handleClassifyAccount("suspect")}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                    Suspect
                  </Button>
                  <Button
                    variant={selectedAccount.account_status === "frozen" ? "default" : "outline"}
                    size="sm"
                    className={selectedAccount.account_status === "frozen" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-300"}
                    onClick={handleFreezeSelectedAccount}
                    disabled={selectedAccount.account_status === "frozen"}
                  >
                    <Snowflake className="w-3.5 h-3.5 mr-1.5" />
                    {selectedAccount.account_status === "frozen" ? "Frozen" : "Freeze"}
                  </Button>
                </div>
                {classificationMessage && (
                  <p className="mt-3 text-center text-xs font-semibold text-green-700">
                    {classificationMessage}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
