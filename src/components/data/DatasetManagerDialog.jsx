import React, { useRef, useState } from "react";
import { Database, RefreshCcw, Upload, Download, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { useAppState } from "@/hooks/useAppState";
import { parseTransactionsCsvChunked } from "@/lib/csvParsingEngine";
import {
  exportInvestigationPDF,
  exportTransactionsCSV,
  exportAccountsCSV,
  exportInvestigationSummaryCSV,
} from "@/lib/exportEngine";

const DATASET_FILE_ACCEPT = ".csv,text/csv";

export default function DatasetManagerDialog({
  triggerVariant = "outline",
  triggerSize = "sm",
  triggerClassName = "",
  triggerLabel = "Upload Data",
  showResetInTrigger = false,
}) {
  const {
    analytics,
    caseData,
    importMeta,
    importTransactionsFromCsv,
    importTransactionsFromCsvBundle,
    resetDemoData,
  } = useAppState();
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");

  const handleDatasetUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";

    if (!selectedFiles.length) {
      return;
    }

    const csvFiles = selectedFiles.filter((file) => file.name.toLowerCase().endsWith(".csv"));

    if (!csvFiles.length) {
      toast({
        variant: "destructive",
        title: "CSV files required",
        description: "Upload one CSV or a bundle of related CSV files to refresh the investigation data.",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportStatus("Starting import...");

    try {
      let result;

      if (csvFiles.length === 1) {
        const [file] = csvFiles;
        const csvText = await file.text();

        await parseTransactionsCsvChunked(csvText, (progress, status) => {
          setImportProgress(progress);
          setImportStatus(status);
        });

        setImportStatus("Processing transactions...");
        result = importTransactionsFromCsv(csvText, file.name);
      } else {
        const datasetFiles = await Promise.all(
          csvFiles.map(async (file, index) => {
            setImportStatus(`Reading file ${index + 1} of ${csvFiles.length}...`);
            return {
              fileName: file.name,
              csvText: await file.text(),
            };
          })
        );

        setImportStatus("Integrating dataset...");
        result = importTransactionsFromCsvBundle(
          datasetFiles,
          `Integrated uploaded dataset (${csvFiles.length} files)`
        );
      }

      setImportStatus("Finalizing refreshed investigation view...");

      toast({
        title: "Dataset updated successfully",
        description: `Imported ${result.importedTransactions} transaction(s). ${result.importedTransactions > 100 ? "Large dataset detected - chunked processing completed." : "The whole application has been recalculated from your uploaded data."}`,
      });

      setImportProgress(0);
      setImportStatus("");
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message || "Unable to apply the uploaded dataset.",
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleReset = () => {
    resetDemoData();
    toast({
      title: "Demo dataset restored",
      description: "The application has been reset to the bundled investigation dataset.",
    });
    setIsOpen(false);
  };

  const handleExportPDF = async () => {
    try {
      await exportInvestigationPDF(caseData, analytics);
      toast({
        title: "PDF exported",
        description: "Investigation report downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    }
  };

  const handleExportTransactionsCSV = () => {
    try {
      exportTransactionsCSV(analytics.transactions, caseData);
      toast({
        title: "Transactions exported",
        description: "CSV file downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    }
  };

  const handleExportAccountsCSV = () => {
    try {
      exportAccountsCSV(analytics.accounts, caseData);
      toast({
        title: "Accounts exported",
        description: "CSV file downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    }
  };

  const handleExportSummaryCSV = () => {
    try {
      exportInvestigationSummaryCSV(caseData, analytics);
      toast({
        title: "Summary exported",
        description: "CSV file downloaded successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          size={triggerSize}
          className={triggerClassName}
        >
          <Database className="w-4 h-4" />
          {triggerLabel}
          {showResetInTrigger && <RefreshCcw className="w-4 h-4 opacity-70" />}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Dataset Manager</DialogTitle>
          <DialogDescription>
            Upload your bank-action CSV files here and the dashboard, graph, alerts, freeze review, recovery, and
            analytics will all refresh from the uploaded dataset.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept={DATASET_FILE_ACCEPT}
          multiple
          className="hidden"
          onChange={handleDatasetUpload}
        />

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">Active dataset</p>
            <p className="mt-1 text-sm text-blue-800">
              {importMeta.fileName || "Demo dataset"}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              Case {caseData.complaint_id} | {analytics.accounts.length} accounts | {analytics.transactions.length} transactions
            </p>
            {importMeta.sourceFiles?.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-700">
                Source files: {importMeta.sourceFiles.join(" | ")}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-white p-4">
            <p className="text-sm font-semibold text-foreground">Upload dataset files</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Use one CSV for a single trail or select multiple related CSV files together. Once imported, the whole
              system recalculates from that dataset.
            </p>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? "Importing..." : "Choose Data Files"}
            </Button>

            {isImporting && (
              <div className="mt-4 space-y-2 rounded-lg bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">{importStatus}</p>
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-blue-700">{Math.round(importProgress)}% complete</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
            <p className="mb-3 text-sm font-semibold text-green-900">Export Reports</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="border-green-300 text-green-700"
              >
                <FileText className="mr-1 h-3 w-3" />
                Export PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportSummaryCSV}
                className="border-green-300 text-green-700"
              >
                <Download className="mr-1 h-3 w-3" />
                Summary
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportTransactionsCSV}
                className="border-green-300 text-green-700"
              >
                <Download className="mr-1 h-3 w-3" />
                Transactions
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportAccountsCSV}
                className="border-green-300 text-green-700"
              >
                <Download className="mr-1 h-3 w-3" />
                Accounts
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleReset}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset To Demo Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
