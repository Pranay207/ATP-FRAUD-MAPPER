export const MANAGED_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.jpg,.jpeg,.png";

const EXTENSION_TO_CATEGORY = {
  ".pdf": "pdf",
  ".doc": "word",
  ".docx": "word",
  ".xls": "excel",
  ".xlsx": "excel",
  ".csv": "excel",
  ".txt": "text",
  ".ppt": "presentation",
  ".pptx": "presentation",
  ".jpg": "image",
  ".jpeg": "image",
  ".png": "image",
};

export function getFileExtension(fileName = "") {
  const normalized = String(fileName || "").trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");
  return lastDotIndex >= 0 ? normalized.slice(lastDotIndex) : "";
}

export function getManagedFileCategory(fileName = "", mimeType = "") {
  const extension = getFileExtension(fileName);
  if (EXTENSION_TO_CATEGORY[extension]) {
    return EXTENSION_TO_CATEGORY[extension];
  }

  if (String(mimeType || "").includes("pdf")) {
    return "pdf";
  }
  if (String(mimeType || "").includes("word")) {
    return "word";
  }
  if (
    String(mimeType || "").includes("excel") ||
    String(mimeType || "").includes("spreadsheet") ||
    String(mimeType || "").includes("csv")
  ) {
    return "excel";
  }

  return "other";
}

export function formatManagedFileCategory(category = "other") {
  const labels = {
    pdf: "PDF",
    word: "Word",
    excel: "Excel",
    text: "Text",
    presentation: "Presentation",
    image: "Image",
    other: "File",
  };

  return labels[category] || labels.other;
}
