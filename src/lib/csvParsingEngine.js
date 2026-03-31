// Chunked CSV parsing for large files with progress tracking
import { parseTransactionsCsv } from "./investigationEngine";

/**
 * Parse large CSV files in chunks to avoid blocking the UI
 * Calls progressCallback with updates every chunk
 */
export async function parseTransactionsCsvChunked(
  csvText,
  progressCallback = (progress, status) => {},
  chunkSize = 1000
) {
  return new Promise((resolve, reject) => {
    try {
      const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length < 2) {
        reject(new Error("CSV must include a header row and at least one data row."));
        return;
      }

      const totalLines = lines.length - 1; // Exclude header
      const totalChunks = Math.ceil(totalLines / chunkSize);
      const chunks = [];

      let currentChunk = 1;
      let processedLines = 0;

      // Break CSV into chunks
      for (let i = 1; i < lines.length; i += chunkSize) {
        const chunkLines = [lines[0], ...lines.slice(i, Math.min(i + chunkSize, lines.length))];
        chunks.push(chunkLines.join("\n"));
      }

      let allTransactions = [];
      let allErrors = [];

      // Process chunks sequentially with Promise to keep UI responsive
      function processNextChunk(index) {
        if (index >= chunks.length) {
          progressCallback(100, "Complete");
          resolve({
            transactions: allTransactions,
            errors: allErrors,
            totalProcessed: totalLines,
            chunkCount: chunks.length,
          });
          return;
        }

        // Use setTimeout to allow UI to update
        setTimeout(() => {
          try {
            progressCallback(
              ((index + 1) / chunks.length) * 100,
              `Processing chunk ${index + 1} of ${chunks.length}`
            );

            const { transactions, errors } = parseTransactionsCsv(chunks[index]);
            allTransactions = allTransactions.concat(transactions);
            allErrors = allErrors.concat(errors);

            processedLines += transactions.length;

            // Move to next chunk
            processNextChunk(index + 1);
          } catch (error) {
            reject(error);
          }
        }, 0);
      }

      // Start processing
      processNextChunk(0);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stream large CSV files for even better performance
 * Returns an iterator that yields transactions one at a time
 */
export async function* streamTransactionsCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.");
  }

  const headerLine = lines[0];
  let processedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const singleRowCsv = `${headerLine}\n${lines[i]}`;
    const { transactions, errors } = parseTransactionsCsv(singleRowCsv);

    if (transactions.length > 0) {
      yield {
        transaction: transactions[0],
        rowIndex: i,
        processedCount: ++processedCount,
      };
    }

    if (errors.length > 0) {
      yield {
        error: errors[0],
        rowIndex: i,
        processedCount,
      };
    }
  }
}

/**
 * Estimate file size and determine optimal chunk size
 */
export function getOptimalChunkSize(fileSizeBytes) {
  // Rough estimate: 150 bytes per row
  const estimatedRows = Math.ceil(fileSizeBytes / 150);

  if (estimatedRows < 100) {
    return 100; // Small files: process all at once
  } else if (estimatedRows < 1000) {
    return 500;
  } else if (estimatedRows < 10000) {
    return 2000;
  } else {
    return 5000; // Large files: bigger chunks
  }
}

/**
 * Validate CSV file before processing
 */
export function validateCsvFile(file) {
  const maxSizeBytes = 100 * 1024 * 1024; // 100MB limit

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 100MB limit`,
    };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return {
      valid: false,
      error: "File must be a CSV file",
    };
  }

  return { valid: true };
}
