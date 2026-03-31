import { jsPDF } from "jspdf";

import { formatCurrency } from "@/lib/investigationEngine";

function downloadBlob(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function cleanFileName(value) {
  return String(value || "document").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
}

export function downloadNotificationLetter(caseData, account, recommendation) {
  const disputedAmount = formatCurrency(recommendation?.disputed_amount || 0);
  const releaseableAmount = formatCurrency(recommendation?.releaseable_amount || 0);

  const html = `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Freeze Notification</title>
      <style>
        body { font-family: "Segoe UI", Arial, sans-serif; margin: 32px; color: #0f172a; line-height: 1.55; }
        h1, h2 { margin-bottom: 8px; }
        .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 18px; }
        .meta { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Anantapur Cyber Cell</h1>
      <p>Case ID: ${caseData.complaint_id}</p>
      <div class="box meta">
        <p><strong>Account Holder:</strong> ${account.account_holder_name}</p>
        <p><strong>Account Number:</strong> ${account.account_number}</p>
        <p><strong>Bank:</strong> ${account.bank_name}</p>
      </div>

      <div class="box">
        <h2>English Notice</h2>
        <p>Your account has been placed under protective review in connection with a cyber fraud investigation handled by Anantapur Cyber Cell.</p>
        <p>Disputed layered amount proposed to be held: <strong>${disputedAmount}</strong>.</p>
        <p>Potential balance eligible for release after verification: <strong>${releaseableAmount}</strong>.</p>
        <p>Please contact Anantapur Cyber Cell with original identity proofs, bank statement, and any supporting records relevant to the transactions under review.</p>
      </div>

      <div class="box">
        <h2>తెలుగు నోటీసు</h2>
        <p>అనంతపురం సైబర్ సెల్ విచారణలో భాగంగా మీ ఖాతా రక్షణాత్మక సమీక్షకు తీసుకోబడింది.</p>
        <p>తాత్కాలికంగా నిలిపివేయవలసిన వివాదాస్పద మొత్తం: <strong>${disputedAmount}</strong>.</p>
        <p>పరిశీలన తరువాత విడుదలకు సిఫార్సు చేయదగిన మొత్తం: <strong>${releaseableAmount}</strong>.</p>
        <p>దయచేసి అసలు గుర్తింపు పత్రాలు, బ్యాంక్ స్టేట్‌మెంట్, మరియు సంబంధిత సాక్ష్యాలతో అనంతపురం సైబర్ సెల్‌ను సంప్రదించండి.</p>
      </div>
    </body>
  </html>`;

  downloadBlob(
    `${cleanFileName(caseData.complaint_id)}-${cleanFileName(account.account_number)}-notice.html`,
    html,
    "text/html;charset=utf-8"
  );
}

function addWrappedText(doc, text, x, y, width) {
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, x, y);
  return y + lines.length * 14;
}

export function generateFreezePacketPdf(caseData, analytics) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const usableWidth = pageWidth - 80;
  let y = 48;

  const ensurePage = (extraHeight = 24) => {
    if (y + extraHeight > 760) {
      doc.addPage();
      y = 48;
    }
  };

  const title = `Freeze Packet - ${caseData.complaint_id}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, 40, y);
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = addWrappedText(
    doc,
    `Victim: ${caseData.victim_name} | Victim Account: ${caseData.victim_account} | Total Fraud Amount: ${formatCurrency(analytics.recoveryMetrics.totalFraudAmount)}`,
    40,
    y,
    usableWidth
  );
  y += 12;

  const addSection = (heading) => {
    ensurePage(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(heading, 40, y);
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  addSection("Immediate Freeze List");
  analytics.immediateFreeze.slice(0, 12).forEach((account, index) => {
    ensurePage(54);
    y = addWrappedText(
      doc,
      `${index + 1}. ${account.account_holder_name} (${account.account_number}) | Risk ${account.risk_score}/100 | Hold ${formatCurrency(account.disputed_amount)} | Priority ${account.freeze_priority}/10`,
      48,
      y,
      usableWidth - 8
    );
  });
  y += 10;

  addSection("Review / Partial Release List");
  analytics.reviewAccounts.slice(0, 12).forEach((account, index) => {
    ensurePage(54);
    y = addWrappedText(
      doc,
      `${index + 1}. ${account.account_holder_name} (${account.account_number}) | Legitimacy ${account.trust_score}/100 | Hold ${formatCurrency(account.disputed_amount)} | Release ${formatCurrency(account.releaseable_amount)}`,
      48,
      y,
      usableWidth - 8
    );
  });
  y += 10;

  addSection("Transaction Paths and Evidence");
  analytics.transactionPaths.slice(0, 10).forEach((path, index) => {
    const chain = path
      .map((transaction) => `${transaction.sender_account} -> ${transaction.receiver_account} (${formatCurrency(transaction.amount)} | ${transaction.reference_id} | ${transaction.timestamp})`)
      .join(" | ");
    ensurePage(70);
    y = addWrappedText(doc, `${index + 1}. ${chain}`, 48, y, usableWidth - 8);
  });
  y += 10;

  addSection("Letter for Bank Nodal Officer");
  y = addWrappedText(
    doc,
    `To: The Nodal Officer, [Bank Name]\nSubject: Immediate hold / debit freeze request in cyber fraud case ${caseData.complaint_id}.\n\nThis is to request urgent debit freeze / protective hold against the attached list of accounts linked to a layered cyber fraud trail. Kindly preserve transaction logs, KYC records, device / IP metadata, and beneficiary mapping for further legal action.`,
    40,
    y,
    usableWidth
  );

  doc.save(`${cleanFileName(caseData.complaint_id)}-freeze-packet.pdf`);
}
