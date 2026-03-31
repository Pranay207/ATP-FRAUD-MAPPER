// Batch freeze operations for coordinated multi-account freezing
import jsPDF from "jspdf";
import { formatCurrency } from "./investigationEngine";

/**
 * Generate a coordinated freeze order for multiple accounts across banks
 * Format: Bank-wise grouping with freeze details and legal references
 */
export function generateBatchFreezeOrder(caseData, selectedAccounts) {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 15;
    const lineHeight = 6;

    // Set colors
    const headerColor = [26, 35, 126]; // Dark blue
    const bankColor = [79, 89, 213]; // Medium blue
    const textColor = [32, 32, 32]; // Dark gray
    const warningColor = [192, 0, 0]; // Red

    // 1. HEADER
    doc.setFontSize(16);
    doc.setTextColor(...headerColor);
    doc.text("COORDINATED ACCOUNT FREEZE ORDER", margin, yPosition);
    yPosition += 12;

    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    doc.text(`Case: ${caseData.complaint_id}`, margin, yPosition);
    yPosition += lineHeight + 1;
    doc.text(`Victim: ${caseData.victim_name}`, margin, yPosition);
    yPosition += lineHeight + 1;
    doc.text(`Fraud Amount: ${formatCurrency(caseData.fraud_amount)}`, margin, yPosition);
    yPosition += lineHeight + 1;
    doc.text(`Issued: ${new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 10;

    // 2. LEGAL AUTHORITY
    doc.setFontSize(9);
    doc.setTextColor(...warningColor);
    doc.text("LEGAL AUTHORITY:", margin, yPosition);
    yPosition += lineHeight;
    
    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    const legalText = [
      "Section 90 - IT Act, 2000",
      "Prevention of Money-Laundering Act (PMLA), 2002",
      "Cybercrime directions from law enforcement",
    ];
    
    legalText.forEach((text) => {
      doc.text(text, margin + 5, yPosition);
      yPosition += lineHeight;
    });

    yPosition += 5;

    // 3. FREEZE ORDERS BY BANK
    const accountsByBank = groupAccountsByBank(selectedAccounts);
    let pageCount = 1;

    accountsByBank.forEach((bankGroup, bankIndex) => {
      // New page if needed
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
        pageCount++;
      }

      // Bank header
      doc.setFontSize(11);
      doc.setTextColor(...bankColor);
      doc.text(`${bankGroup.bankName} - ${bankGroup.accounts.length} Account(s)`, margin, yPosition);
      yPosition += 8;

      doc.setLineWidth(0.5);
      doc.setDrawColor(79, 89, 213);
      doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
      yPosition += 3;

      // Account details for this bank
      bankGroup.accounts.forEach((account, accountIndex) => {
        doc.setFontSize(9);
        doc.setTextColor(...textColor);

        // Account info
        doc.text(`${accountIndex + 1}. ${account.account_holder_name}`, margin + 5, yPosition);
        yPosition += lineHeight;

        doc.setFontSize(8);
        doc.text(`Account: ${account.account_number}`, margin + 10, yPosition);
        yPosition += lineHeight - 1;

        doc.text(`Current Balance: ${formatCurrency(account.current_balance)}`, margin + 10, yPosition);
        yPosition += lineHeight - 1;

        doc.text(`To Be Frozen: ${formatCurrency(account.disputed_amount)}`, margin + 10, yPosition);
        yPosition += lineHeight - 1;

        doc.text(`Risk Level: ${getRiskLabel(account.risk_score)} (Score: ${account.risk_score})`, margin + 10, yPosition);
        yPosition += lineHeight;

        // Freeze reason
        doc.setFont(undefined, "italic");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(`Reason: ${account.classification === "splitter" ? "Rapid fund splitting detected" : account.classification === "mastermind" ? "Primary perpetrator account" : "Money laundering intermediary"}`, margin + 10, yPosition);
        doc.setFont(undefined, "normal");
        yPosition += lineHeight + 2;
      });

      yPosition += 3;
    });

    // 4. SUMMARY PAGE
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
      pageCount++;
    }

    yPosition += 5;
    doc.setFontSize(11);
    doc.setTextColor(...bankColor);
    doc.text("FREEZE SUMMARY", margin, yPosition);
    yPosition += 8;

    doc.setLineWidth(0.5);
    doc.setDrawColor(79, 89, 213);
    doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
    yPosition += 5;

    doc.setFontSize(9);
    doc.setTextColor(...textColor);

    const totalAccounts = selectedAccounts.length;
    const totalFreezingAmount = selectedAccounts.reduce((sum, acc) => sum + (acc.disputed_amount || 0), 0);
    const bankCount = accountsByBank.length;
    const highRiskCount = selectedAccounts.filter((acc) => acc.risk_score >= 75).length;

    const summaryData = [
      [`Total Accounts to Freeze:`, `${totalAccounts}`],
      [`Total Amount to Freeze:`, `${formatCurrency(totalFreezingAmount)}`],
      [`Banks Involved:`, `${bankCount}`],
      [`High-Risk Accounts:`, `${highRiskCount}`],
      [`Timeline Priority:`, `IMMEDIATE (within 2 hours)`],
    ];

    summaryData.forEach((row) => {
      doc.text(row[0], margin + 5, yPosition);
      doc.text(row[1], pageWidth * 0.6, yPosition);
      yPosition += lineHeight + 1;
    });

    // 5. INSTRUCTIONS
    yPosition += 5;
    doc.setFontSize(9);
    doc.setTextColor(...warningColor);
    doc.text("URGENT - OFFICER INSTRUCTIONS:", margin, yPosition);
    yPosition += lineHeight + 1;

    doc.setFontSize(8);
    doc.setTextColor(...textColor);
    const instructions = [
      "1. Print this document with official letterhead",
      "2. Submit freeze order to each bank immediately via authorized channel",
      "3. Include Case ID in all bank communications",
      "4. Obtain freeze confirmation from each bank within 24 hours",
      "5. Upload confirmation receipts to recovery system",
      "6. Monitor accounts for any unauthorized movement",
      "7. Send similar notice to victims for their records",
    ];

    instructions.forEach((instruction) => {
      if (yPosition > pageHeight - 15) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(instruction, margin + 5, yPosition);
      yPosition += lineHeight;
    });

    // 6. FOOTER ON LAST PAGE
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is an AUTO-GENERATED freeze order from ATP Fraud Mapper. Valid with official seal.",
      margin,
      pageHeight - 10
    );

    // Save
    doc.save(`ATP_Batch_Freeze_${caseData.complaint_id}_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (error) {
    console.error("Batch freeze order generation failed:", error);
    throw new Error(`Failed to generate freeze order: ${error.message}`);
  }
}

/**
 * Group accounts by bank for coordinated freeze
 */
function groupAccountsByBank(accounts) {
  const banksMap = new Map();

  accounts.forEach((account) => {
    const bankName = account.bank_name || "Unknown Bank";
    if (!banksMap.has(bankName)) {
      banksMap.set(bankName, {
        bankName,
        accounts: [],
      });
    }
    banksMap.get(bankName).accounts.push(account);
  });

  // Sort by number of accounts (largest banks first)
  return Array.from(banksMap.values()).sort((a, b) => b.accounts.length - a.accounts.length);
}

/**
 * Get risk label based on score
 */
function getRiskLabel(riskScore) {
  if (riskScore >= 85) return "CRITICAL";
  if (riskScore >= 70) return "HIGH";
  if (riskScore >= 50) return "MEDIUM";
  return "LOW";
}

/**
 * Generate bank-wise notification emails for coordinated freeze
 */
export function generateBankNotifications(caseData, selectedAccounts) {
  const accountsByBank = groupAccountsByBank(selectedAccounts);
  const notifications = [];

  accountsByBank.forEach((bankGroup) => {
    const totalFreezeAmount = bankGroup.accounts.reduce((sum, acc) => sum + (acc.disputed_amount || 0), 0);
    
    const email = {
      bankName: bankGroup.bankName,
      subject: `URGENT: Account Freeze Order - Case ${caseData.complaint_id}`,
      recipients: [`legal@${bankGroup.bankName.toLowerCase().replace(/\s+/g, '')}.com`],
      body: `
COORDINATED ACCOUNT FREEZE ORDER

Case ID: ${caseData.complaint_id}
Victim: ${caseData.victim_name}
Total Fraud Amount: ${formatCurrency(caseData.fraud_amount)}
Issued: ${new Date().toLocaleString()}

FREEZE DETAILS FOR ${bankGroup.bankName}:
Total Accounts: ${bankGroup.accounts.length}
Total To Freeze: ${formatCurrency(totalFreezeAmount)}

ACCOUNTS:
${bankGroup.accounts.map((acc, i) => `${i + 1}. ${acc.account_number} (${acc.account_holder_name}) - ${formatCurrency(acc.disputed_amount)}`).join("\n")}

LEGAL BASIS:
- Section 90, IT Act 2000
- Prevention of Money-Laundering Act, 2002
- Cybercrime direction from law enforcement

ACTION REQUIRED:
1. Freeze all listed accounts within 2 hours
2. Confirm freeze with this reference
3. Monitor for unauthorized access
4. DO NOT release without explicit written approval

Case Officer: ${caseData.investigating_officer || "SI Cyber Cell"}
Contact: [Officer Contact Information]

---
This is an automated freeze order from ATP Fraud Mapper
Valid with official law enforcement seal/authorization
      `.trim(),
    };

    notifications.push(email);
  });

  return notifications;
}

/**
 * Generate CSV for batch freeze import to banking systems
 */
export function exportBatchFreezeCSV(caseData, selectedAccounts) {
  try {
    const headers = [
      "Case ID",
      "Account Number",
      "Bank Name",
      "Account Holder",
      "Freeze Amount",
      "Current Balance",
      "Risk Score",
      "Classification",
      "Reason",
      "Priority",
    ];

    const rows = selectedAccounts.map((acc) => [
      caseData.complaint_id,
      acc.account_number,
      acc.bank_name,
      acc.account_holder_name,
      acc.disputed_amount,
      acc.current_balance,
      acc.risk_score,
      acc.classification,
      `${acc.classification === "splitter" ? "Rapid splitting" : acc.classification === "mastermind" ? "Primary perpetrator" : "Intermediary"}`,
      acc.freeze_priority || 10,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          const str = String(cell || "");
          return str.includes(",") ? `"${str}"` : str;
        }).join(",")
      ),
    ].join("\n");

    downloadCSV(csvContent, `ATP_Batch_Freeze_${caseData.complaint_id}.csv`);
    return true;
  } catch (error) {
    console.error("Batch freeze CSV export failed:", error);
    throw new Error(`Failed to export freeze CSV: ${error.message}`);
  }
}

/**
 * Helper: Download CSV
 */
function downloadCSV(csvContent, fileName) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Get summary stats for selected accounts
 */
export function getBatchFreezeStats(selectedAccounts) {
  const totalAmount = selectedAccounts.reduce((sum, acc) => sum + (acc.disputed_amount || 0), 0);
  const totalBalance = selectedAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const highRiskCount = selectedAccounts.filter((acc) => acc.risk_score >= 75).length;
  const banksInvolved = new Set(selectedAccounts.map((acc) => acc.bank_name)).size;
  const avgRiskScore = Math.round(
    selectedAccounts.reduce((sum, acc) => sum + (acc.risk_score || 0), 0) / selectedAccounts.length
  );

  return {
    totalAccounts: selectedAccounts.length,
    totalAmount,
    totalBalance,
    highRiskCount,
    banksInvolved,
    avgRiskScore,
  };
}
