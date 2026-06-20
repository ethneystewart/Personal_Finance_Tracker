import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const state = {
  statements: [],
  transactions: [],
  draftStatements: [],
  draftTransactions: [],
  draftFiles: [],
  selectedTransactionIds: [],
  activeStatementKey: "all",
  activeView: "all-data",
  pendingStatementKind: null,
  filters: {
    search: "",
    category: "",
    flow: "",
  },
};

const STORAGE_KEY = "my-personal-finance-tracker-statements-v1";

const els = {
  fileInput: document.querySelector("#fileInput"),
  dropzone: document.querySelector("#dropzone"),
  status: document.querySelector("#status"),
  demoButton: document.querySelector("#demoButton"),
  clearButton: document.querySelector("#clearButton"),
  allDataNavButton: document.querySelector("#allDataNavButton"),
  newEntryButton: document.querySelector("#newEntryButton"),
  budgetNavButton: document.querySelector("#budgetNavButton"),
  allDataPage: document.querySelector("#allDataPage"),
  newEntryPage: document.querySelector("#newEntryPage"),
  budgetPage: document.querySelector("#budgetPage"),
  entryPanel: document.querySelector("#entryPanel"),
  statementTypeStep: document.querySelector("#statementTypeStep"),
  statementTypeCreditButton: document.querySelector("#statementTypeCreditButton"),
  statementTypeDebitButton: document.querySelector("#statementTypeDebitButton"),
  statementTypeChip: document.querySelector("#statementTypeChip"),
  statementTypeChipLabel: document.querySelector("#statementTypeChipLabel"),
  changeStatementTypeButton: document.querySelector("#changeStatementTypeButton"),
  draftReviewSection: document.querySelector("#draftReviewSection"),
  draftStatementFields: document.querySelector("#draftStatementFields"),
  entryActions: document.querySelector("#entryActions"),
  entrySummary: document.querySelector("#entrySummary"),
  submitEntryButton: document.querySelector("#submitEntryButton"),
  discardEntryButton: document.querySelector("#discardEntryButton"),
  bulkCategoryTools: document.querySelector("#bulkCategoryTools"),
  selectionCount: document.querySelector("#selectionCount"),
  selectAllButton: document.querySelector("#selectAllButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  bulkCategorySelect: document.querySelector("#bulkCategorySelect"),
  applyCategoryButton: document.querySelector("#applyCategoryButton"),
  deleteSelectedButton: document.querySelector("#deleteSelectedButton"),
  transactionFilters: document.querySelector("#transactionFilters"),
  transactionTabs: document.querySelector("#transactionTabs"),
  searchFilter: document.querySelector("#searchFilter"),
  categoryFilter: document.querySelector("#categoryFilter"),
  flowFilter: document.querySelector("#flowFilter"),
  statementCount: document.querySelector("#statementCount"),
  incomeTotal: document.querySelector("#incomeTotal"),
  spendingTotal: document.querySelector("#spendingTotal"),
  netTotal: document.querySelector("#netTotal"),
  statementSections: document.querySelector("#statementSections"),
  flowChart: document.querySelector("#flowChart"),
  categoryChart: document.querySelector("#categoryChart"),
  balanceChart: document.querySelector("#balanceChart"),
  creditCardSpendChart: document.querySelector("#creditCardSpendChart"),
  timelineChart: document.querySelector("#timelineChart"),
  transactionTable: document.querySelector("#transactionTable"),
};

const categoryRules = [
  { name: "Rent & Utilities", keywords: ["rent", "mortgage", "property", "hydro", "electric", "water", "internet", "phone", "utility"] },
  { name: "Groceries", keywords: ["grocery", "freshco", "metro", "loblaws", "no frills", "superstore", "sobeys", "walmart", "costco"] },
  { name: "Entertainment & Going Out", keywords: ["restaurant", "cafe", "coffee", "starbucks", "tim hortons", "ubereats", "doordash", "skip", "bar", "pub", "netflix", "spotify", "cineplex"] },
  { name: "Transportation & Car", keywords: ["uber", "lyft", "shell", "esso", "petro", "transit", "parking", "presto", "gas", "insurance", "garage"] },
  { name: "Travel", keywords: ["air canada", "westjet", "hotel", "airbnb", "booking", "expedia", "flight", "trip"] },
  { name: "Shopping & Beauty", keywords: ["amazon", "shop", "store", "sephora", "indigo", "ikea", "marketplace", "beauty", "ulta"] },
  { name: "Income", keywords: ["payroll", "salary", "deposit", "etransfer", "refund", "interest"] },
  { name: "Fees", keywords: ["fee", "charge", "service"] },
  { name: "Cash", keywords: ["atm", "cash withdrawal"] },
];

const palette = ["#ff8db1", "#b457b8", "#88d5b5", "#7ec8f4", "#ffb36c", "#7f95ff", "#ff7c70", "#52c4a8"];
const categoryColorMap = {
  "Rent & Utilities": { solid: "#7f95ff", soft: "rgba(127, 149, 255, 0.14)", border: "rgba(127, 149, 255, 0.3)" },
  "Entertainment & Going Out": { solid: "#ff8db1", soft: "rgba(255, 141, 177, 0.14)", border: "rgba(255, 141, 177, 0.3)" },
  "Transportation & Car": { solid: "#ffb36c", soft: "rgba(255, 179, 108, 0.16)", border: "rgba(255, 179, 108, 0.3)" },
  Travel: { solid: "#6f84f7", soft: "rgba(111, 132, 247, 0.14)", border: "rgba(111, 132, 247, 0.3)" },
  "Shopping & Beauty": { solid: "#b457b8", soft: "rgba(180, 87, 184, 0.14)", border: "rgba(180, 87, 184, 0.3)" },
  Groceries: { solid: "#52c4a8", soft: "rgba(82, 196, 168, 0.16)", border: "rgba(82, 196, 168, 0.3)" },
  Misc: { solid: "#7ec8f4", soft: "rgba(126, 200, 244, 0.16)", border: "rgba(126, 200, 244, 0.3)" },
  Undecided: { solid: "#9f8baa", soft: "rgba(159, 139, 170, 0.14)", border: "rgba(159, 139, 170, 0.28)" },
  Income: { solid: "#2d8a63", soft: "rgba(45, 138, 99, 0.14)", border: "rgba(45, 138, 99, 0.28)" },
  Credits: { solid: "#88d5b5", soft: "rgba(136, 213, 181, 0.16)", border: "rgba(136, 213, 181, 0.3)" },
  Fees: { solid: "#d95b7a", soft: "rgba(217, 91, 122, 0.14)", border: "rgba(217, 91, 122, 0.28)" },
  Cash: { solid: "#8e8aa8", soft: "rgba(142, 138, 168, 0.14)", border: "rgba(142, 138, 168, 0.28)" },
};
const categoryOptions = [
  "Rent & Utilities",
  "Entertainment & Going Out",
  "Transportation & Car",
  "Travel",
  "Shopping & Beauty",
  "Groceries",
  "Misc",
  "Undecided",
  "Income",
  "Credits",
  "Fees",
  "Cash",
];

init();

function init() {
  hydrateFromStorage();
  populateCategoryOptions();

  els.fileInput.addEventListener("change", (event) => {
    handleFiles(Array.from(event.target.files || []));
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropzone.classList.remove("dragging");
    });
  });

  els.dropzone.addEventListener("drop", (event) => {
    const files = Array.from(event.dataTransfer?.files || []).filter(
      (file) => file.type === "application/pdf"
    );
    handleFiles(files);
  });

  els.demoButton.addEventListener("click", loadDemoData);
  els.clearButton.addEventListener("click", clearDashboard);
  els.statementTypeCreditButton.addEventListener("click", () => chooseStatementKind("credit-card"));
  els.statementTypeDebitButton.addEventListener("click", () => chooseStatementKind("bank-account"));
  els.changeStatementTypeButton.addEventListener("click", changeStatementKind);
  els.draftStatementFields.addEventListener("input", handleDraftStatementFieldInput);
  els.allDataNavButton.addEventListener("click", () => switchView("all-data"));
  els.newEntryButton.addEventListener("click", focusEntryPanel);
  els.budgetNavButton.addEventListener("click", () => switchView("budget"));
  els.submitEntryButton.addEventListener("click", submitDraftEntry);
  els.discardEntryButton.addEventListener("click", discardDraftEntry);
  els.selectAllButton.addEventListener("click", selectVisibleTransactions);
  els.clearSelectionButton.addEventListener("click", clearTransactionSelection);
  els.applyCategoryButton.addEventListener("click", applyBulkCategory);
  els.deleteSelectedButton.addEventListener("click", deleteSelectedTransactions);
  els.transactionTable.addEventListener("click", handleTransactionTableClick);
  els.transactionTabs.addEventListener("click", handleTransactionTabClick);
  els.searchFilter.addEventListener("input", handleFilterInput);
  els.categoryFilter.addEventListener("change", handleFilterInput);
  els.flowFilter.addEventListener("change", handleFilterInput);
  render();
}

async function handleFiles(files) {
  if (!files.length) {
    setStatus("No PDFs were selected.");
    return;
  }

  if (!state.pendingStatementKind) {
    setStatus("Choose whether this is a credit card or debit statement first.");
    return;
  }

  setStatus(`Reading ${files.length} PDF statement${files.length === 1 ? "" : "s"}...`);

  const parsedStatements = [];
  const archiveResults = [];

  for (const [index, file] of files.entries()) {
    try {
      setStatus(`Extracting text from ${file.name} (${index + 1}/${files.length})...`);
      const text = await extractTextFromPdf(file);
      const statement = parseRbcStatement(text, file.name, state.pendingStatementKind);
      statement.cardLabel = guessCardLabel(file.name, statement);
      statement.monthLabel = guessMonthLabel(statement.statementPeriod);
      statement.source = {
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        savedAt: new Date().toISOString(),
      };
      archiveResults.push({ file, statement });
      parsedStatements.push(statement);
    } catch (error) {
      console.error(error);
      setStatus(`I couldn't read ${file.name}. Try another text-based RBC statement PDF.`);
    }
  }

  if (!parsedStatements.length) {
    render();
    return;
  }

  state.draftStatements = parsedStatements.sort(sortByPeriod);
  state.draftTransactions = state.draftStatements.flatMap((statement) => statement.transactions || []);
  state.draftFiles = archiveResults;
  state.selectedTransactionIds = [];
  state.activeStatementKey = "all";
  resetFilters();
  setStatus(
    `Draft entry ready. Review ${state.draftTransactions.length} parsed transaction${state.draftTransactions.length === 1 ? "" : "s"}, adjust categories, then submit it to your totals.`
  );
  focusEntryPanel();
  render();
}

async function extractTextFromPdf(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts = [];
  let withdrawalDepositColumns = null;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rows = [];
    const items = textContent.items.filter((item) => "str" in item && item.str.trim());

    const pageColumns = detectWithdrawalDepositColumns(items);
    if (pageColumns) {
      withdrawalDepositColumns = pageColumns;
    }

    items.forEach((item) => {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      let textValue = item.str.trim();

      if (withdrawalDepositColumns && isPlainMoneyAmount(textValue) && x < withdrawalDepositColumns.withdrawalEnd) {
        textValue = `-${textValue}`;
      }

      let row = rows.find((entry) => Math.abs(entry.y - y) <= 2);
      if (!row) {
        row = { y, parts: [] };
        rows.push(row);
      }

      row.parts.push({ x, text: textValue });
    });

    const pageText = rows
      .sort((a, b) => b.y - a.y)
      .map((row) =>
        row.parts
          .sort((a, b) => a.x - b.x)
          .map((part) => part.text)
          .join(" ")
          .replace(/\s{2,}/g, " ")
          .trim()
      )
      .filter(Boolean)
      .join("\n");

    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}

function detectWithdrawalDepositColumns(items) {
  const withdrawalsHeader = items.find((item) => /^withdrawals/i.test(item.str.trim()));
  const depositsHeader = items.find((item) => /^deposits/i.test(item.str.trim()));

  if (!withdrawalsHeader || !depositsHeader) {
    return null;
  }

  const withdrawalsEndX = withdrawalsHeader.transform[4] + (withdrawalsHeader.width || 0);
  const depositsStartX = depositsHeader.transform[4];

  if (depositsStartX <= withdrawalsEndX) {
    return null;
  }

  return { withdrawalEnd: (withdrawalsEndX + depositsStartX) / 2 };
}

function isPlainMoneyAmount(text) {
  return /^\(?\$?\d[\d,]*\.\d{2}\)?$/.test(text);
}

function parseRbcStatement(text, fileName, forcedStatementKind) {
  const normalizedText = normalizeStatementText(text);
  const rawLines = normalizedText
    .split(/\n+/)
    .flatMap(splitMergedTransactionLines)
    .map((line) => line.trim())
    .filter((line) => line && !shouldIgnoreLine(line));

  const accountHolder =
    firstMatch(normalizedText, [
      /(?:statement for|account holder|primary cardholder)\s+([A-Z][A-Z\s'.-]{3,})/i,
      /name\s*[:\-]\s*([A-Z][A-Z\s'.-]{3,})/i,
    ]) || "RBC Customer";
  const accountType =
    firstMatch(normalizedText, [
      /(visa infinite|visa platinum|mastercard|credit card|day to day banking|signature no limit banking|high interest esavings|chequing|savings)/i,
    ]) || "RBC Account";
  const accountNumber =
    firstMatch(normalizedText, [
      /account number[:\s]*([0-9\-*]{4,})/i,
      /card number[:\s]*([0-9\-*]{4,})/i,
      /ending in[:\s]*([0-9*]{4,})/i,
    ]) || "Unavailable";
  const statementPeriod =
    extractStatementPeriod(normalizedText) || "Period not found";

  const statementKind = forcedStatementKind || detectStatementKind(normalizedText, accountType);
  const openingBalance = extractMoneyAfterLabel(normalizedText, [
    "opening balance",
    "balance forward",
    "previous balance",
    "previous statement balance",
    "balance from last statement",
  ]);
  const closingBalance = extractMoneyAfterLabel(normalizedText, [
    "closing balance",
    "new balance",
    "balance on",
    "new balance total",
    "statement balance",
    "closing account balance",
  ]);
  const totalCredits = extractMoneyAfterLabel(normalizedText, [
    "payments and credits",
    "payments/credits",
    "credits",
    "total credits",
    "total deposits",
    "deposits and credits",
    "payments",
    "direct deposits",
  ]);
  const totalCharges = extractMoneyAfterLabel(normalizedText, [
    "purchases and debits",
    "purchases/debits",
    "new purchases",
    "total purchases",
    "debits",
    "total withdrawals",
    "withdrawals and debits",
    "purchases",
    "point of sale purchases",
  ]);
  const serviceFees = extractMoneyAfterLabel(normalizedText, [
    "service fees",
    "fees charged",
    "total service charges",
    "interest charges",
    "monthly fee",
    "banking fee",
  ]);

  const transactions = parseTransactions(rawLines, fileName, statementPeriod, statementKind);
  const creditsFromTransactions = sumAmounts(
    transactions
      .filter((item) => item.flowType === "credit")
      .map((item) => Math.abs(item.amount))
  );
  const chargesFromTransactions = sumAmounts(
    transactions
      .filter((item) => item.flowType === "charge")
      .map((item) => Math.abs(item.amount))
  );
  const feesFromTransactions = sumAmounts(
    transactions
      .filter((item) => item.category === "Fees")
      .map((item) => Math.abs(item.amount))
  );

  return {
    id: crypto.randomUUID(),
    fileName,
    statementKind,
    accountHolder,
    accountType: toTitleCase(accountType),
    accountNumber,
    statementPeriod,
    openingBalance: openingBalance ?? 0,
    closingBalance: closingBalance ?? openingBalance ?? 0,
    totalCredits: totalCredits ?? creditsFromTransactions,
    totalCharges: totalCharges ?? chargesFromTransactions,
    serviceFees: serviceFees ?? feesFromTransactions,
    totalInflow: totalCredits ?? creditsFromTransactions,
    totalOutflow: totalCharges ?? chargesFromTransactions,
    transactions,
  };
}

function parseTransactions(lines, fileName, statementPeriod, statementKind) {
  if (statementKind === "credit-card") {
    return parseCreditCardTransactions(lines, fileName, statementPeriod, statementKind);
  }

  return parseDebitTransactions(lines, fileName, statementPeriod, statementKind);
}

function parseDebitTransactions(lines, fileName, statementPeriod, statementKind) {
  const transactions = [];
  let current = null;
  let lastDateLabel = "";
  let pendingDescriptionPrefix = "";

  const pushCurrent = () => {
    if (current) {
      const transaction = finalizeDebitTransaction(current, fileName, statementPeriod, statementKind);
      if (transaction) {
        transactions.push(transaction);
      }
    }
    current = null;
  };

  lines.forEach((line) => {
    const cleaned = cleanTransactionLine(line);
    if (!cleaned || shouldIgnoreLine(cleaned)) {
      return;
    }

    const dated = parseTransactionLineStart(cleaned, statementPeriod);
    if (dated) {
      pushCurrent();
      pendingDescriptionPrefix = "";
      lastDateLabel = dated.dateLabel;
      current = dated;
      if (current.amount !== null) {
        pushCurrent();
      }
      return;
    }

    if (current) {
      const trailing = extractTrailingAmounts(cleaned);
      if (
        trailing &&
        !looksLikeStatementBoilerplate(cleaned) &&
        !isNonTransactionDescription(cleaned)
      ) {
        if (trailing.prefix) {
          current.description = `${current.description} ${trailing.prefix}`.trim();
        }
        current.amount = trailing.amount;
        current.balanceAfter = trailing.balanceAfter;
        pushCurrent();
        return;
      }

      if (!looksLikeStatementBoilerplate(cleaned) && !isNonTransactionDescription(cleaned)) {
        current.description = `${current.description} ${cleaned}`.trim();
      }
      return;
    }

    if (!lastDateLabel) {
      return;
    }

    const undated = parseUndatedTransactionStart(cleaned);
    if (undated) {
      const description = pendingDescriptionPrefix
        ? `${pendingDescriptionPrefix} ${undated.description}`.trim()
        : undated.description;
      pendingDescriptionPrefix = "";
      current = {
        dateLabel: lastDateLabel,
        description,
        amount: undated.amount,
        balanceAfter: undated.balanceAfter,
      };
      pushCurrent();
      return;
    }

    if (!looksLikeStatementBoilerplate(cleaned) && !isNonTransactionDescription(cleaned)) {
      pendingDescriptionPrefix = pendingDescriptionPrefix
        ? `${pendingDescriptionPrefix} ${cleaned}`.trim()
        : cleaned;
    }
  });

  pushCurrent();
  return transactions;
}

function finalizeDebitTransaction(current, fileName, statementPeriod, statementKind) {
  const description = normalizeDescription(current.description);

  if (!description || current.amount === null || Number.isNaN(current.amount)) {
    return null;
  }

  const category = categorizeTransaction(description, current.amount, statementKind);
  const flowType = inferFlowType(description, current.amount, statementKind, category);

  return {
    id: crypto.randomUUID(),
    fileName,
    statementPeriod,
    dateLabel: current.dateLabel,
    isoDate: toApproxIsoDate(current.dateLabel, statementPeriod),
    description,
    category,
    flowType,
    amount: current.amount,
    balanceAfter: current.balanceAfter ?? null,
  };
}

function extractTrailingAmounts(line) {
  const match = line.match(
    /^(?<prefix>.*?)\s*(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)(?:\s+(?<balance>\(?-?\$?\d[\d,]*\.\d{2}\)?))?\b.*$/
  );
  if (!match?.groups) {
    return null;
  }

  const amount = parseMoney(match.groups.amount);
  if (Number.isNaN(amount)) {
    return null;
  }

  return {
    prefix: match.groups.prefix.trim(),
    amount,
    balanceAfter: match.groups.balance ? parseMoney(match.groups.balance) : null,
  };
}

function parseUndatedTransactionStart(line) {
  const money = "\\(?-?\\$?\\d[\\d,]*\\.\\d{2}\\)?";
  const patterns = [
    new RegExp(`^(?<description>.+?)\\s+(?<amount>${money})(?:\\s+(?<balance>${money}))?\\b.*$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) {
      continue;
    }

    const description = normalizeDescription(match.groups.description);
    if (!description || isNonTransactionDescription(description) || looksLikeStatementBoilerplate(description)) {
      return null;
    }

    return {
      description,
      amount: parseMoney(match.groups.amount),
      balanceAfter: match.groups.balance ? parseMoney(match.groups.balance) : null,
    };
  }

  return null;
}

function parseCreditCardTransactions(lines, fileName, statementPeriod, statementKind) {
  const transactions = [];
  let current = null;

  lines.forEach((line) => {
    const cleaned = cleanTransactionLine(line);
    const parsed = parseCreditCardTransactionStart(cleaned, statementPeriod);

    if (parsed) {
      if (current) {
        transactions.push(finalizeCreditCardTransaction(current, fileName, statementPeriod, statementKind));
      }
      current = parsed;
      return;
    }

    if (!current || shouldIgnoreCreditCardContinuation(cleaned)) {
      return;
    }

    if (current.amount === null) {
      const continuationAmount = extractContinuationAmount(cleaned);
      if (!Number.isNaN(continuationAmount)) {
        current.amount = continuationAmount;
        return;
      }
    }

    if (isCreditCardSupplementalDetail(cleaned)) {
      current.details.push(cleaned);
      return;
    }

    if (current.amount === null && !/^\d{6,}$/.test(cleaned)) {
      current.description = `${current.description} ${cleaned}`.trim();
    }
  });

  if (current) {
    transactions.push(finalizeCreditCardTransaction(current, fileName, statementPeriod, statementKind));
  }

  return transactions.filter(Boolean);
}

function parseCreditCardTransactionStart(line, statementPeriod) {
  const monthDay = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}";
  const numeric = "\\d{1,2}\\/\\d{1,2}";
  const money = "\\(?-?\\$?\\d[\\d,]*\\.\\d{2}\\)?";
  const patterns = [
    // Find the FIRST money-shaped token after the description and stop there —
    // anything trailing (e.g. sidebar text sharing the same extracted row) is discarded.
    new RegExp(`^(?<transactionDate>${monthDay})(?<postingDate>${monthDay})\\s+(?<description>.+?)\\s+(?<amount>${money})\\b.*$`, "i"),
    new RegExp(`^(?<transactionDate>${monthDay})\\s+(?<postingDate>${monthDay})\\s+(?<description>.+?)\\s+(?<amount>${money})\\b.*$`, "i"),
    new RegExp(`^(?<transactionDate>${numeric})(?<postingDate>${numeric})\\s+(?<description>.+?)\\s+(?<amount>${money})\\b.*$`, "i"),
    new RegExp(`^(?<transactionDate>${numeric})\\s+(?<postingDate>${numeric})\\s+(?<description>.+?)\\s+(?<amount>${money})\\b.*$`, "i"),
    // No money token anywhere on this line — leave amount unresolved for a later continuation line.
    new RegExp(`^(?<transactionDate>${monthDay})(?<postingDate>${monthDay})\\s+(?<description>.+)$`, "i"),
    new RegExp(`^(?<transactionDate>${monthDay})\\s+(?<postingDate>${monthDay})\\s+(?<description>.+)$`, "i"),
    new RegExp(`^(?<transactionDate>${numeric})(?<postingDate>${numeric})\\s+(?<description>.+)$`, "i"),
    new RegExp(`^(?<transactionDate>${numeric})\\s+(?<postingDate>${numeric})\\s+(?<description>.+)$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) {
      continue;
    }

    const description = normalizeDescription(match.groups.description);
    if (isNonTransactionDescription(description) || looksLikeStatementBoilerplate(description)) {
      return null;
    }

    return {
      transactionDateLabel: normalizeDateLabel(match.groups.transactionDate, statementPeriod),
      postingDateLabel: normalizeDateLabel(match.groups.postingDate, statementPeriod),
      description,
      amount: match.groups.amount ? parseMoney(match.groups.amount) : null,
      details: [],
    };
  }

  return null;
}

function shouldIgnoreCreditCardContinuation(line) {
  return (
    !line ||
    shouldIgnoreLine(line) ||
    isCreditCardStructuralLine(line) ||
    /^\d{10,}$/.test(line) ||
    /^ethney stewart$/i.test(line) ||
    /^\d{4}\s+\d{2}\*\*\s+\*{2,}\s+\d{4}/i.test(line) ||
    /^\-?\s*primary/i.test(line) ||
    /^(transaction date|posting date|activity description|amount)/i.test(line)
  );
}

function finalizeCreditCardTransaction(current, fileName, statementPeriod, statementKind) {
  const description = normalizeDescription(current.description);

  if (!description || current.amount === null || Number.isNaN(current.amount)) {
    return null;
  }

  const category = categorizeTransaction(description, current.amount, statementKind);
  const flowType = inferFlowType(description, current.amount, statementKind, category);

  return {
    id: crypto.randomUUID(),
    fileName,
    statementPeriod,
    dateLabel: current.transactionDateLabel,
    postingDateLabel: current.postingDateLabel,
    isoDate: toApproxIsoDate(current.transactionDateLabel, statementPeriod),
    postingIsoDate: toApproxIsoDate(current.postingDateLabel, statementPeriod),
    description,
    details: current.details,
    category,
    flowType,
    amount: current.amount,
    balanceAfter: null,
  };
}

function isCreditCardSupplementalDetail(line) {
  return (
    /^foreign currency/i.test(line) ||
    /^exchange rate/i.test(line) ||
    /foreign currency.*exchange rate/i.test(line) ||
    /^merchant amount/i.test(line) ||
    /^reference number/i.test(line)
  );
}

function extractContinuationAmount(line) {
  const match = line.match(/^(?<prefix>.*?)\s*(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)\b.*$/);
  if (!match?.groups) {
    return Number.NaN;
  }

  const prefix = match.groups.prefix.trim();
  const isSafePrefix =
    !prefix ||
    /^\d{6,}$/.test(prefix) ||
    isCreditCardSupplementalDetail(prefix);

  if (!isSafePrefix) {
    return Number.NaN;
  }

  return parseMoney(match.groups.amount);
}

function isCreditCardStructuralLine(line) {
  return (
    /subtotal of monthly activity/i.test(line) ||
    /transaction posting date date/i.test(line) ||
    /activity description/i.test(line) ||
    /time to pay/i.test(line) ||
    /interest rate chart/i.test(line) ||
    /total account balance/i.test(line) ||
    /important information about your/i.test(line) ||
    /if you make only the/i.test(line) ||
    /this estimate is intended solely/i.test(line) ||
    /description rate \(%\) remaining balance/i.test(line) ||
    /payment due date/i.test(line) ||
    /statement-\d+/i.test(line) ||
    /\*{2,}\s*\d{4}\s*-\s*primary/i.test(line)
  );
}

function categorizeTransaction(description, amount, statementKind) {
  const lower = description.toLowerCase();
  if (
    /(payment thank you|refund|merchant credit|return|reversal|adjustment|cash back|cashback|credit voucher)/i.test(
      lower
    )
  ) {
    return "Credits";
  }
  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      if (statementKind === "credit-card") {
        return rule.name;
      }
      return amount > 0 && rule.name !== "Fees" ? "Income" : rule.name;
    }
  }

  if (statementKind !== "credit-card" && amount > 0) {
    return "Income";
  }

  if (lower.includes("payment")) {
    return "Undecided";
  }

  return "Undecided";
}

function render() {
  syncSelection();
  syncActiveStatementTab();
  renderView();
  renderOverview();
  renderStatements();
  renderFlowChart();
  renderCategoryChart();
  renderBalanceChart();
  renderCreditCardSpendChart();
  renderTimelineChart();
  renderEntryFlow();
  renderDraftStatementFields();
  renderTransactionFilters();
  renderTransactionTabs();
  renderEntryActions();
  renderBulkCategoryTools();
  renderTransactionTable();
}

function renderEntryFlow() {
  const hasDraft = isReviewingDraft();
  const hasKind = Boolean(state.pendingStatementKind);

  els.statementTypeStep.classList.toggle("hidden", hasKind);
  els.statementTypeChip.classList.toggle("hidden", !hasKind);
  els.dropzone.classList.toggle("hidden", !hasKind || hasDraft);
  els.draftReviewSection.classList.toggle("hidden", !hasDraft);

  if (hasKind) {
    els.statementTypeChipLabel.textContent =
      state.pendingStatementKind === "credit-card" ? "Credit card statement" : "Debit / bank account statement";
  }
}

function renderDraftStatementFields() {
  if (!isReviewingDraft()) {
    els.draftStatementFields.innerHTML = "";
    return;
  }

  els.draftStatementFields.innerHTML = state.draftStatements
    .map(
      (statement, index) => `
        <div class="draft-statement-card">
          <div class="field-group">
            <label for="draftMonth-${index}">Month</label>
            <input
              id="draftMonth-${index}"
              type="text"
              data-draft-field="monthLabel"
              data-draft-index="${index}"
              value="${escapeHtml(statement.monthLabel || "")}"
              placeholder="e.g. May 2026"
            />
          </div>
          <div class="field-group">
            <label for="draftCard-${index}">Card / account</label>
            <input
              id="draftCard-${index}"
              type="text"
              data-draft-field="cardLabel"
              data-draft-index="${index}"
              value="${escapeHtml(statement.cardLabel || "")}"
              placeholder="e.g. Cash Back Mastercard"
            />
          </div>
          <span class="draft-statement-filename">${escapeHtml(statement.fileName)}</span>
        </div>
      `
    )
    .join("");
}

function handleDraftStatementFieldInput(event) {
  const input = event.target.closest("[data-draft-field]");
  if (!input) {
    return;
  }

  const index = Number(input.dataset.draftIndex);
  const field = input.dataset.draftField;
  const statement = state.draftStatements[index];
  if (!statement) {
    return;
  }

  statement[field] = input.value;
}

function renderOverview() {
  const inflow = sumAmounts(
    state.transactions
      .filter((transaction) => transaction.flowType === "credit")
      .map((transaction) => Math.abs(transaction.amount))
  );
  const outflow = sumAmounts(
    state.transactions
      .filter((transaction) => transaction.flowType === "charge")
      .map((transaction) => Math.abs(transaction.amount))
  );
  const netChange = inflow - outflow;

  els.statementCount.textContent = String(state.statements.length);
  els.incomeTotal.previousElementSibling.textContent = "Total money in";
  els.spendingTotal.previousElementSibling.textContent = "Total money out";
  els.netTotal.previousElementSibling.textContent = "Net change";
  els.incomeTotal.textContent = formatMoney(inflow);
  els.spendingTotal.textContent = formatMoney(outflow);
  els.netTotal.textContent = formatMoney(netChange);
  els.netTotal.className = netChange < 0 ? "amount-negative" : "amount-positive";
}

function renderView() {
  const isAllData = state.activeView === "all-data";
  const isNewEntry = state.activeView === "new-entry";
  const isBudget = state.activeView === "budget";

  els.allDataPage.classList.toggle("hidden", !isAllData);
  els.newEntryPage.classList.toggle("hidden", !isNewEntry);
  els.budgetPage.classList.toggle("hidden", !isBudget);

  els.allDataNavButton.classList.toggle("secondary-button", isAllData);
  els.allDataNavButton.classList.toggle("ghost-button", !isAllData);
  els.newEntryButton.classList.toggle("secondary-button", isNewEntry);
  els.newEntryButton.classList.toggle("ghost-button", !isNewEntry);
  els.budgetNavButton.classList.toggle("secondary-button", isBudget);
  els.budgetNavButton.classList.toggle("ghost-button", !isBudget);
}

function renderStatements() {
  if (!state.statements.length) {
    els.statementSections.className = "stack-list empty-state";
    els.statementSections.textContent =
      "Upload credit card or debit statements to see saved summaries, balances, and parsed sections.";
    return;
  }

  els.statementSections.className = "stack-list";
  els.statementSections.innerHTML = state.statements
    .map(
      (statement) => `
        <article class="statement-card">
          <h3>${escapeHtml(statement.cardLabel || statement.fileName)}</h3>
          <p>${escapeHtml(formatStatementType(statement.statementKind))} · ${escapeHtml(statement.monthLabel || statement.statementPeriod)}</p>
          <div class="statement-meta">
            <span class="chip">Holder: ${escapeHtml(statement.accountHolder)}</span>
            <span class="chip">Account: ${escapeHtml(statement.accountNumber)}</span>
          </div>
          <div class="section-summary">
            <span class="chip">Opening ${formatMoney(statement.openingBalance)}</span>
            <span class="chip">Closing ${formatMoney(statement.closingBalance)}</span>
            <span class="chip">${escapeHtml(getInflowLabel(statement.statementKind))} ${formatMoney(getStatementInflow(statement))}</span>
            <span class="chip">${escapeHtml(getOutflowLabel(statement.statementKind))} ${formatMoney(getStatementOutflow(statement))}</span>
            <span class="chip">Fees ${formatMoney(statement.serviceFees)}</span>
            <span class="chip">${statement.transactions.length} transactions</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderFlowChart() {
  if (!state.statements.length) {
    setEmpty(els.flowChart, "Charts will appear after parsing.");
    return;
  }

  const series = [
    { label: "Money in", value: sumAmounts(state.transactions.filter((item) => item.flowType === "credit").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #88d5b5, #52c4a8)" },
    { label: "Money out", value: sumAmounts(state.transactions.filter((item) => item.flowType === "charge").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #ff8db1, #d95b7a)" },
    { label: "Fees", value: sumAmounts(state.transactions.filter((item) => item.category === "Fees").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #ffb36c, #f58d47)" },
  ];

  const max = Math.max(...series.map((item) => item.value), 1);
  els.flowChart.className = "chart-area";
  els.flowChart.innerHTML = `
    <div class="bar-chart">
      ${series
        .map(
          (item) => `
            <div class="bar-item">
              <div class="bar-value">${formatMoney(item.value)}</div>
              <div class="bar-visual" style="height:${Math.max((item.value / max) * 220, 24)}px; background:${item.color};"></div>
              <div class="bar-label">${item.label}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCategoryChart() {
  const outflowTransactions = state.transactions.filter(
    (item) => item.flowType === "charge" && findSubmittedStatementKind(item) === "credit-card"
  );
  if (!outflowTransactions.length) {
    setEmpty(els.categoryChart, "Credit card spending categories will show here.");
    return;
  }

  const grouped = groupBy(outflowTransactions, (item) => item.category);
  const entries = Object.entries(grouped)
    .map(([name, items]) => ({
      name,
      value: Math.abs(sumAmounts(items.map((item) => item.amount))),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const total = sumAmounts(entries.map((entry) => entry.value));
  let offset = 0;
  const gradientParts = entries
    .map((entry, index) => {
      const start = offset;
      offset += (entry.value / total) * 100;
      return `${getCategoryColor(entry.name).solid} ${start.toFixed(2)}% ${offset.toFixed(2)}%`;
    })
    .join(", ");

  els.categoryChart.className = "chart-area";
  els.categoryChart.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${gradientParts});">
        <div class="donut-center">
          <strong>${formatMoney(total)}</strong>
          <span>Credit card spending</span>
        </div>
      </div>
      <div class="legend">
        ${entries
          .map(
            (entry, index) => `
              <div class="legend-item">
                <div class="legend-name">
                  <span class="swatch" style="background:${getCategoryColor(entry.name).solid}"></span>
                  <span>${escapeHtml(entry.name)}</span>
                </div>
                <strong>${formatMoney(entry.value)}</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderBalanceChart() {
  if (!state.statements.length) {
    setEmpty(els.balanceChart, "Closing balances will be graphed here.");
    return;
  }

  const points = state.statements.map((statement, index) => ({
    label: compactLabel(statement.statementPeriod, statement.cardLabel || statement.fileName),
    value: statement.closingBalance,
    index,
  }));
  renderLineChart(els.balanceChart, points, "Closing balance");
}

function renderCreditCardSpendChart() {
  const creditCardCharges = state.statements
    .filter((statement) => statement.statementKind === "credit-card")
    .map((statement) => ({
      label: compactLabel(statement.statementPeriod, statement.cardLabel || statement.fileName),
      value: sumAmounts(
        (statement.transactions || [])
          .filter((transaction) => transaction.flowType === "charge")
          .map((transaction) => Math.abs(transaction.amount))
      ),
    }))
    .filter((entry) => entry.value > 0);

  if (!creditCardCharges.length) {
    setEmpty(els.creditCardSpendChart, "Credit card monthly spending will show here.");
    return;
  }

  const max = Math.max(...creditCardCharges.map((entry) => entry.value), 1);
  els.creditCardSpendChart.className = "chart-area";
  els.creditCardSpendChart.innerHTML = `
    <div class="bar-chart">
      ${creditCardCharges
        .map(
          (entry) => `
            <div class="bar-item">
              <div class="bar-value">${formatMoney(entry.value)}</div>
              <div class="bar-visual" style="height:${Math.max((entry.value / max) * 220, 24)}px; background:linear-gradient(180deg, #6f84f7, #b457b8);"></div>
              <div class="bar-label">${escapeHtml(entry.label)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimelineChart() {
  if (!state.transactions.length) {
    setEmpty(els.timelineChart, "Daily or statement-level spending trends will show here.");
    return;
  }

  const buckets = {};
  state.transactions.forEach((tx) => {
    if (tx.flowType !== "charge" || findSubmittedStatementKind(tx) !== "credit-card") {
      return;
    }
    const key = tx.isoDate || tx.dateLabel;
    buckets[key] = (buckets[key] || 0) + Math.abs(tx.amount);
  });

  const entries = Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(-10);

  const max = Math.max(...entries.map((entry) => entry.value), 1);
  els.timelineChart.className = "chart-area";
  els.timelineChart.innerHTML = `
    <div class="timeline-chart">
      ${entries
        .map(
          (entry, index) => `
            <div class="timeline-bar">
              <div class="timeline-value">${formatMoney(entry.value)}</div>
              <div class="timeline-visual" style="height:${Math.max((entry.value / max) * 220, 24)}px; background:linear-gradient(180deg, ${palette[index % palette.length]}, #ffffff);"></div>
              <div class="timeline-label">${escapeHtml(shortDateLabel(entry.label))}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLineChart(container, points, label) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 520;
  const height = 240;
  const pad = 18;

  const mapped = points.map((point, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
    const y =
      height - pad - ((point.value - min) / Math.max(max - min, 1)) * (height - pad * 2);
    return { ...point, x, y };
  });

  const path = mapped.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${mapped[mapped.length - 1].x} ${height - pad} L ${mapped[0].x} ${height - pad} Z`;

  container.className = "chart-area";
  container.innerHTML = `
    <div>
      <svg viewBox="0 0 ${width} ${height}" class="line-svg" aria-label="${escapeHtml(label)}">
        <path d="${areaPath}" class="line-area"></path>
        <path d="${path}" class="line-path"></path>
        ${mapped.map((point) => `<circle class="point" cx="${point.x}" cy="${point.y}" r="6"></circle>`).join("")}
      </svg>
      <div class="axis-labels">
        ${mapped.map((point) => `<span>${escapeHtml(point.label)}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderTransactionTable() {
  if (!getReviewTransactions().length) {
    els.bulkCategoryTools.classList.add("hidden");
    els.transactionFilters.classList.add("hidden");
    els.transactionTabs.classList.add("hidden");
    setEmpty(els.transactionTable, "Start a new entry to review parsed transactions before submitting them.");
    return;
  }

  const visibleTransactions = getVisibleTransactions();
  if (!visibleTransactions.length) {
    els.transactionTable.className = "table-wrap empty-state";
    els.transactionTable.textContent = "No transactions match the current tab and filters.";
    return;
  }

  const rows = [...visibleTransactions]
    .sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""))
    .map(
      (tx) => `
        <tr class="transaction-row ${isTransactionSelected(tx.id) ? "selected-row" : ""}" data-transaction-id="${escapeHtml(tx.id)}">
          <td>${escapeHtml(tx.dateLabel)}</td>
          <td>${escapeHtml(tx.postingDateLabel || "—")}</td>
          <td>${escapeHtml(tx.description)}</td>
          <td>${renderCategoryBadge(tx.category)}</td>
          <td class="${tx.flowType === "credit" ? "amount-positive" : "amount-negative"}">${formatMoney(tx.amount)}</td>
          <td>${tx.balanceAfter === null ? "—" : formatMoney(tx.balanceAfter)}</td>
          <td>${escapeHtml(tx.fileName)}</td>
          <td>
            <button
              type="button"
              class="delete-transaction-button"
              data-delete-transaction-id="${escapeHtml(tx.id)}"
              title="Delete transaction"
              aria-label="Delete transaction"
            >✕</button>
          </td>
        </tr>
      `
    )
    .join("");

  els.transactionTable.className = "table-wrap";
  els.transactionTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Transaction Date</th>
          <th>Posting Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Balance After</th>
          <th>Statement</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderBulkCategoryTools() {
  const hasVisibleTransactions = getVisibleTransactions().length > 0;
  els.bulkCategoryTools.classList.toggle("hidden", !hasVisibleTransactions);
  els.selectionCount.textContent = `${state.selectedTransactionIds.length} selected`;
}

function renderEntryActions() {
  const hasDraft = isReviewingDraft();
  els.entryActions.classList.toggle("hidden", !hasDraft);
  if (!hasDraft) {
    return;
  }

  els.entrySummary.textContent = `${state.draftStatements.length} draft statement${state.draftStatements.length === 1 ? "" : "s"} · ${state.draftTransactions.length} parsed transaction${state.draftTransactions.length === 1 ? "" : "s"}`;
}

function renderTransactionFilters() {
  const hasTransactions = getReviewTransactions().length > 0;
  els.transactionFilters.classList.toggle("hidden", !hasTransactions);
  els.searchFilter.value = state.filters.search;
  els.categoryFilter.value = state.filters.category;
  els.flowFilter.value = state.filters.flow;
}

function renderTransactionTabs() {
  const tabs = getStatementTabs();
  const hasTransactions = tabs.length > 0;
  els.transactionTabs.classList.toggle("hidden", !hasTransactions);
  if (!hasTransactions) {
    els.transactionTabs.innerHTML = "";
    return;
  }

  els.transactionTabs.innerHTML = [
    `<button class="tab-button ${state.activeStatementKey === "all" ? "active" : ""}" type="button" data-statement-key="all">All reports</button>`,
    ...tabs.map(
      (statement) => `
        <button class="tab-button ${state.activeStatementKey === buildStatementKey(statement) ? "active" : ""}" type="button" data-statement-key="${escapeHtml(buildStatementKey(statement))}">
          ${escapeHtml(statement.cardLabel || statement.fileName)}
        </button>
      `
    ),
  ].join("");
}

function handleTransactionTabClick(event) {
  const button = event.target.closest("[data-statement-key]");
  if (!button) {
    return;
  }
  state.activeStatementKey = button.dataset.statementKey || "all";
  state.selectedTransactionIds = [];
  render();
}

function handleFilterInput() {
  state.filters.search = els.searchFilter.value.trim().toLowerCase();
  state.filters.category = els.categoryFilter.value;
  state.filters.flow = els.flowFilter.value;
  state.selectedTransactionIds = [];
  render();
}

function handleTransactionTableClick(event) {
  const deleteButton = event.target.closest("[data-delete-transaction-id]");
  if (deleteButton) {
    deleteTransactions([deleteButton.dataset.deleteTransactionId]);
    return;
  }

  const row = event.target.closest(".transaction-row");
  if (!row) {
    return;
  }

  const { transactionId } = row.dataset;
  if (!transactionId) {
    return;
  }

  if (isTransactionSelected(transactionId)) {
    removeSelectedTransaction(transactionId);
  } else {
    addSelectedTransaction(transactionId);
  }

  render();
}

function selectVisibleTransactions() {
  const visibleIds = getVisibleTransactions().map((transaction) => transaction.id);
  const selected = new Set(state.selectedTransactionIds);
  visibleIds.forEach((id) => selected.add(id));
  state.selectedTransactionIds = Array.from(selected);
  render();
}

function clearTransactionSelection() {
  state.selectedTransactionIds = [];
  render();
}

function applyBulkCategory() {
  const nextCategory = els.bulkCategorySelect.value;
  if (!nextCategory) {
    setStatus("Choose a category first, then apply it to the selected transactions.");
    return;
  }

  if (!state.selectedTransactionIds.length) {
    setStatus("Select one or more transactions first.");
    return;
  }

  const selectedIds = new Set(state.selectedTransactionIds);
  const targetStatements = isReviewingDraft() ? state.draftStatements : state.statements;
  targetStatements.forEach((statement) => {
    statement.transactions.forEach((transaction) => {
      if (selectedIds.has(transaction.id)) {
        transaction.category = nextCategory;
      }
    });
    statement.serviceFees = sumAmounts(
      statement.transactions
        .filter((transaction) => transaction.category === "Fees")
        .map((transaction) => Math.abs(transaction.amount))
    );
  });

  if (isReviewingDraft()) {
    state.draftTransactions = state.draftStatements.flatMap((statement) => statement.transactions || []);
  } else {
    state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
    persistStatements();
  }
  setStatus(
    `Updated ${state.selectedTransactionIds.length} transaction${state.selectedTransactionIds.length === 1 ? "" : "s"} to ${nextCategory}.`
  );
  state.selectedTransactionIds = [];
  render();
}

function deleteSelectedTransactions() {
  if (!state.selectedTransactionIds.length) {
    setStatus("Select one or more transactions first.");
    return;
  }

  deleteTransactions(state.selectedTransactionIds);
}

function deleteTransactions(transactionIds) {
  const idsToDelete = new Set(transactionIds);
  if (!idsToDelete.size) {
    return;
  }

  const targetStatements = isReviewingDraft() ? state.draftStatements : state.statements;
  targetStatements.forEach((statement) => {
    statement.transactions = (statement.transactions || []).filter(
      (transaction) => !idsToDelete.has(transaction.id)
    );
    statement.serviceFees = sumAmounts(
      statement.transactions
        .filter((transaction) => transaction.category === "Fees")
        .map((transaction) => Math.abs(transaction.amount))
    );
  });

  if (isReviewingDraft()) {
    state.draftTransactions = state.draftStatements.flatMap((statement) => statement.transactions || []);
  } else {
    state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
    persistStatements();
  }

  setStatus(`Deleted ${idsToDelete.size} transaction${idsToDelete.size === 1 ? "" : "s"}.`);
  state.selectedTransactionIds = [];
  render();
}

function clearDashboard() {
  state.statements = [];
  state.transactions = [];
  state.draftStatements = [];
  state.draftTransactions = [];
  state.draftFiles = [];
  state.selectedTransactionIds = [];
  state.activeStatementKey = "all";
  els.fileInput.value = "";
  persistStatements();
  setStatus("Saved data cleared from this browser.");
  render();
}

function loadDemoData() {
  state.statements = [
    {
      id: crypto.randomUUID(),
      fileName: "RBC-May-2026.pdf",
      accountHolder: "Demo Customer",
      accountType: "RBC Visa",
      accountNumber: "****1234",
      statementPeriod: "May 1, 2026 to May 31, 2026",
      statementKind: "credit-card",
      openingBalance: 3120.41,
      closingBalance: 4475.18,
      totalCredits: 2140,
      totalCharges: 3478.82,
      serviceFees: 16.95,
      transactions: [
        createDemoTx("May 02", "Payment Thank You", -2140, 980.41, "Credits", "credit", "2026-05-02"),
        createDemoTx("May 03", "Metro Grocery", 138.42, 1118.83, "Groceries", "charge", "2026-05-03"),
        createDemoTx("May 04", "Tim Hortons", 11.58, 1130.41, "Entertainment & Going Out", "charge", "2026-05-04"),
        createDemoTx("May 08", "Air Canada", 650, 1780.41, "Travel", "charge", "2026-05-08"),
        createDemoTx("May 10", "Shell Fuel", 72.16, 1852.57, "Transportation & Car", "charge", "2026-05-10"),
        createDemoTx("May 14", "Amazon Marketplace", 88.34, 1940.91, "Shopping & Beauty", "charge", "2026-05-14"),
        createDemoTx("May 21", "Interest Charge", 16.95, 1957.86, "Fees", "charge", "2026-05-21"),
        createDemoTx("May 23", "Uber Trip", 24.03, 1981.89, "Transportation & Car", "charge", "2026-05-23"),
        createDemoTx("May 25", "Starbucks", 8.42, 1990.31, "Entertainment & Going Out", "charge", "2026-05-25"),
        createDemoTx("May 28", "Return Credit", -45, 1945.31, "Credits", "credit", "2026-05-28"),
      ],
    },
    {
      id: crypto.randomUUID(),
      fileName: "RBC-Jun-2026.pdf",
      accountHolder: "Demo Customer",
      accountType: "RBC Visa",
      accountNumber: "****1234",
      statementPeriod: "Jun 1, 2026 to Jun 30, 2026",
      statementKind: "credit-card",
      openingBalance: 4475.18,
      closingBalance: 3397.52,
      totalCredits: 2300,
      totalCharges: 1210.29,
      serviceFees: 16.95,
      transactions: [
        createDemoTx("Jun 02", "Payment Thank You", -2300, 2175.18, "Credits", "credit", "2026-06-02"),
        createDemoTx("Jun 03", "FreshCo Grocery", 121.77, 2296.95, "Groceries", "charge", "2026-06-03"),
        createDemoTx("Jun 12", "Uber Eats", 42.14, 2339.09, "Entertainment & Going Out", "charge", "2026-06-12"),
        createDemoTx("Jun 20", "Costco", 184.61, 2523.70, "Groceries", "charge", "2026-06-20"),
        createDemoTx("Jun 21", "Interest Charge", 16.95, 2540.65, "Fees", "charge", "2026-06-21"),
        createDemoTx("Jun 24", "Petro Canada", 68.90, 2609.55, "Transportation & Car", "charge", "2026-06-24"),
        createDemoTx("Jun 27", "WestJet", 525.48, 3135.03, "Travel", "charge", "2026-06-27"),
        createDemoTx("Jun 29", "Amazon Marketplace", 91.44, 3226.47, "Shopping & Beauty", "charge", "2026-06-29"),
        createDemoTx("Jun 30", "Refund Credit", -50, 3176.47, "Credits", "credit", "2026-06-30"),
      ],
    },
    {
      id: crypto.randomUUID(),
      fileName: "RBC-Debit-Jun-2026.pdf",
      accountHolder: "Demo Customer",
      accountType: "RBC Chequing",
      accountNumber: "****5678",
      statementPeriod: "Jun 1, 2026 to Jun 30, 2026",
      statementKind: "bank-account",
      openingBalance: 1825.22,
      closingBalance: 2144.87,
      totalCredits: 3250,
      totalCharges: 2930.35,
      totalInflow: 3250,
      totalOutflow: 2930.35,
      serviceFees: 11.95,
      transactions: [
        createDemoTx("Jun 01", "Payroll Deposit", 1625, 3450.22, "Income", "credit", "2026-06-01"),
        createDemoTx("Jun 03", "Rent Payment", -1550, 1900.22, "Rent & Utilities", "charge", "2026-06-03"),
        createDemoTx("Jun 04", "FreshCo Grocery", -128.10, 1772.12, "Groceries", "charge", "2026-06-04"),
        createDemoTx("Jun 09", "E-Transfer Deposit", 250, 2022.12, "Income", "credit", "2026-06-09"),
        createDemoTx("Jun 11", "Hydro Payment", -96.34, 1925.78, "Rent & Utilities", "charge", "2026-06-11"),
        createDemoTx("Jun 14", "Shell Fuel", -74.88, 1850.90, "Transportation & Car", "charge", "2026-06-14"),
        createDemoTx("Jun 15", "Payroll Deposit", 1625, 3475.90, "Income", "credit", "2026-06-15"),
        createDemoTx("Jun 18", "Costco", -210.45, 3265.45, "Groceries", "charge", "2026-06-18"),
        createDemoTx("Jun 23", "Service Fee", -11.95, 3253.50, "Fees", "charge", "2026-06-23"),
        createDemoTx("Jun 26", "Amazon Marketplace", -64.63, 3188.87, "Shopping & Beauty", "charge", "2026-06-26"),
      ],
    },
  ];

  state.transactions = state.statements.flatMap((statement) => statement.transactions);
  state.draftStatements = [];
  state.draftTransactions = [];
  state.draftFiles = [];
  state.selectedTransactionIds = [];
  state.activeStatementKey = "all";
  persistStatements();
  setStatus("Demo data loaded and saved locally. You can still upload your own PDFs anytime.");
  render();
}

async function submitDraftEntry() {
  if (!isReviewingDraft()) {
    setStatus("There is no draft entry to submit right now.");
    return;
  }

  const merged = [...state.statements, ...state.draftStatements];
  const byFile = new Map(merged.map((statement) => [buildStatementKey(statement), statement]));
  state.statements = Array.from(byFile.values()).sort(sortByPeriod);
  state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
  persistStatements();

  const archiveSummary = await archiveUploadedFiles(state.draftFiles);
  const submittedCount = state.draftStatements.length;
  clearDraftState();
  switchView("all-data");
  setStatus(
    `Submitted ${submittedCount} draft statement${submittedCount === 1 ? "" : "s"} into your totals. ${archiveSummary}`
  );
  render();
}

function discardDraftEntry() {
  if (!isReviewingDraft()) {
    setStatus("There is no draft entry to discard.");
    return;
  }

  clearDraftState();
  setStatus("Draft entry discarded. Your saved totals were not changed.");
  render();
}

function createDemoTx(dateLabel, description, amount, balanceAfter, category, flowType, isoDate) {
  return {
    id: crypto.randomUUID(),
    fileName: "Demo",
    statementPeriod: "Demo",
    dateLabel,
    isoDate,
    description,
    category,
    flowType,
    amount,
    balanceAfter,
  };
}

function detectStatementKind(text, accountType) {
  if (/(day to day banking|signature no limit banking|high interest esavings|chequing|savings)/i.test(accountType)) {
    return "bank-account";
  }
  if (/(visa|mastercard|credit card)/i.test(accountType)) {
    return "credit-card";
  }

  const creditCardSignals = [
    /minimum payment/i,
    /credit limit/i,
    /available credit/i,
    /payment due date/i,
    /previous account balance/i,
    /calculating your balance/i,
  ].filter((pattern) => pattern.test(text)).length;

  return creditCardSignals >= 2 ? "credit-card" : "bank-account";
}

function normalizeStatementText(text) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

function splitMergedTransactionLines(line) {
  return line
    .split(
      /(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b)|(?=\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b)|(?=\b\d{1,2}\/\d{1,2}\b)/
    )
    .map((part) => part.trim())
    .filter(Boolean);
}

function shouldIgnoreLine(line) {
  const trimmed = line.trim();
  return (
    /^(page \d+|date description amount|date details amount|transaction details|account summary)$/i.test(
      trimmed
    ) ||
    /^\d+\s+of\s+\d+$/i.test(trimmed) ||
    /^date\s+description\s+withdrawals/i.test(trimmed) ||
    /^details of your account activity/i.test(trimmed) ||
    /please check this account statement/i.test(trimmed) ||
    /if you opted to receive cheque images/i.test(trimmed) ||
    /please retain this statement/i.test(trimmed) ||
    /trademarks? of royal bank/i.test(trimmed) ||
    /registered trade-mark/i.test(trimmed) ||
    /licensees of the trade-mark/i.test(trimmed) ||
    /gst registration number/i.test(trimmed)
  );
}

function extractStatementPeriod(text) {
  return firstMatch(text, [
    /statement (?:from|period)\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /for the period\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /statement period\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /statement period\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /transactions?\s+(?:from|for)\s+([A-Za-z]{3,9}\s+\d{1,2}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s+to\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4}\s*(?:to|-)\s*\d{1,2}\/\d{1,2}\/\d{2,4})/i,
    /([A-Za-z]{3,9}\s+\d{1,2}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
  ]) || "";
}

function cleanTransactionLine(line) {
  return line
    .replace(/\s{2,}/g, " ")
    .replace(/\b(CR|DR)\b/gi, "")
    .replace(/\bavailable credit\b.*$/i, "")
    .replace(/\bcredit limit\b.*$/i, "")
    .replace(/\bminimum payment\b.*$/i, "")
    .replace(/\baccount summary\b.*$/i, "")
    .replace(/\s+\d+\s+of\s+\d+\s*$/i, "")
    .replace(/\s+page\s+\d+\s*$/i, "")
    .trim();
}

function parseTransactionLineStart(line, statementPeriod) {
  const date =
    "(?:\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2}|\\d{1,2}\\/\\d{1,2})";
  const money = "\\(?-?\\$?\\d[\\d,]*\\.\\d{2}\\)?";
  const patterns = [
    // Find the FIRST money-shaped token as the amount, an immediately-adjacent
    // second one as the balance, and discard anything else trailing (e.g. a
    // sidebar box sharing the same extracted row).
    new RegExp(`^(?<date>${date})\\s+(?<description>.+?)\\s+(?<amount>${money})(?:\\s+(?<balance>${money}))?\\b.*$`, "i"),
    // No money token anywhere on this line — leave amount unresolved for a later continuation line.
    new RegExp(`^(?<date>${date})\\s+(?<description>.+)$`, "i"),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) {
      continue;
    }

    const normalizedDescription = normalizeDescription(match.groups.description);
    const descriptionDate = extractLeadingDescriptionDate(normalizedDescription, statementPeriod);
    const description = stripLeadingDescriptionDate(normalizedDescription, statementPeriod);
    if (isNonTransactionDescription(description) || looksLikeStatementBoilerplate(description)) {
      return null;
    }

    return {
      dateLabel: descriptionDate || normalizeDateLabel(match.groups.date, statementPeriod),
      description,
      amount: match.groups.amount ? parseMoney(match.groups.amount) : null,
      balanceAfter: match.groups.balance ? parseMoney(match.groups.balance) : null,
    };
  }

  return null;
}

function normalizeDescription(description) {
  return description
    .replace(
      /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b)/gi,
      "$1 "
    )
    .replace(/^((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2})\s+/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\bPOS\b/gi, "POS")
    .replace(/\bDBT\b/gi, "Debit")
    .trim();
}

function extractLeadingDescriptionDate(description, statementPeriod) {
  const match = description.match(
    /^(?<date>\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2})\b/i
  );
  if (!match?.groups?.date) {
    return "";
  }
  return normalizeDateLabel(match.groups.date, statementPeriod);
}

function stripLeadingDescriptionDate(description, statementPeriod) {
  const match = description.match(
    /^(?<date>\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}|\d{1,2}\/\d{1,2})\s*(?<rest>.*)$/i
  );
  if (!match?.groups) {
    return description;
  }

  const normalizedLeadingDate = normalizeDateLabel(match.groups.date, statementPeriod);
  const originalLeadingDate = match.groups.date.replace(/\s+/g, " ").trim();
  const rest = (match.groups.rest || "").trim();

  if (!rest) {
    return description;
  }

  if (
    normalizedLeadingDate === originalLeadingDate.toUpperCase() ||
    /^[A-Za-z0-9*]/.test(rest)
  ) {
    return rest;
  }

  return description;
}

function isNonTransactionDescription(description) {
  return /^(opening balance|closing balance|new balance|payments and credits|purchases and debits|total deposits|total withdrawals|available credit|credit limit)$/i.test(
    description
  );
}

function looksLikeStatementBoilerplate(description) {
  return (
    /subtotal of monthly activity/i.test(description) ||
    /transaction posting date/i.test(description) ||
    /time to pay/i.test(description) ||
    /total account balance/i.test(description) ||
    /interest rate chart/i.test(description) ||
    /important information/i.test(description) ||
    /payment due date/i.test(description) ||
    /statement-\d+/i.test(description) ||
    /\*{2,}\s*\d{4}\s*-\s*primary/i.test(description)
  );
}

function normalizeDateLabel(dateLabel, statementPeriod) {
  if (/^\d{1,2}\/\d{1,2}$/.test(dateLabel)) {
    const year = extractStatementYear(statementPeriod);
    const [month, day] = dateLabel.split("/");
    const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T12:00:00`);
    return date.toLocaleDateString("en-CA", { month: "short", day: "2-digit" });
  }
  return dateLabel.replace(/\s+/g, " ").trim();
}

function extractStatementYear(statementPeriod) {
  const yearMatch = statementPeriod.match(/\b(20\d{2})\b/g);
  return yearMatch?.[yearMatch.length - 1] || String(new Date().getFullYear());
}

function getStatementMonthKey(statementPeriod) {
  const endDate = extractEndDate(statementPeriod);
  if (endDate) {
    return endDate.slice(0, 7);
  }
  return new Date().toISOString().slice(0, 7);
}

function inferFlowType(description, amount, statementKind, category) {
  const lower = description.toLowerCase();
  if (statementKind === "credit-card") {
    if (/(payment|refund|credit|return|reversal|adjustment|cash back|cashback)/i.test(lower)) {
      return "credit";
    }
    if (amount < 0) {
      return "credit";
    }
    return "charge";
  }

  if (category === "Income" || amount > 0) {
    return "credit";
  }
  return "charge";
}

function extractMoneyAfterLabel(text, labels) {
  for (const label of labels) {
    const patterns = [
      new RegExp(`${escapeForRegex(label)}[^\\d$(\\-]*([\\-]?[\\$]?\\d[\\d,]*\\.\\d{2}|\\([\\$]?\\d[\\d,]*\\.\\d{2}\\))`, "i"),
      new RegExp(`${escapeForRegex(label)}\\s*[:\\-]?\\s*([\\-]?[\\$]?\\d[\\d,]*\\.\\d{2}|\\([\\$]?\\d[\\d,]*\\.\\d{2}\\))`, "i"),
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseMoney(match[1]);
      }
    }
  }
  return null;
}

function parseMoney(value) {
  if (!value) {
    return Number.NaN;
  }
  const cleaned = value.replace(/\s+/g, "").replace(/[$,]/g, "").trim();
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    return -Number(cleaned.slice(1, -1));
  }
  return Number(cleaned);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value || 0);
}

function sumAmounts(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function matchValue(text, regex) {
  return text.match(regex)?.[1]?.trim() || "";
}

function firstMatch(text, regexes) {
  for (const regex of regexes) {
    const match = text.match(regex)?.[1]?.trim();
    if (match) {
      return match;
    }
  }
  return "";
}

function sortByPeriod(a, b) {
  return (extractEndDate(a.statementPeriod) || "").localeCompare(extractEndDate(b.statementPeriod) || "");
}

function extractEndDate(period) {
  const rangeMatch = period.match(/(.+?)\s*(?:to|-)\s*(.+)/i);
  if (!rangeMatch) {
    return toSortableDate(period);
  }
  return toSortableDate(rangeMatch[2].trim(), period);
}

function toApproxIsoDate(dateLabel, statementPeriod) {
  const year = extractStatementYear(statementPeriod);
  if (!year) {
    return "";
  }
  return toSortableDate(`${dateLabel} ${year}`);
}

function toSortableDate(value, periodHint = "") {
  const prepared = normalizeDateForParsing(value, periodHint);
  const date = new Date(prepared);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

function normalizeDateForParsing(value, periodHint = "") {
  const trimmed = value.trim();
  const hintedYear = extractStatementYear(periodHint);

  if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split("/");
    return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [month, day, year] = trimmed.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  if (/^[A-Za-z]{3,9}\s+\d{1,2}$/.test(trimmed) && hintedYear) {
    return `${trimmed} ${hintedYear}`;
  }

  return trimmed;
}

function compactLabel(statementPeriod, fallback) {
  const parts = statementPeriod.split(/\bto\b|-/i).map((part) => part.trim());
  if (parts.length > 1) {
    return shortDateLabel(parts[1]);
  }
  return fallback;
}

function hydrateFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return;
    }

    state.statements = parsed.sort(sortByPeriod);
    normalizeStatementCategories(state.statements);
    state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
    state.selectedTransactionIds = [];
    state.activeStatementKey = "all";
    setStatus(
      `Loaded ${state.statements.length} saved statement${state.statements.length === 1 ? "" : "s"} from this browser.`
    );
  } catch (error) {
    console.error(error);
    setStatus("Saved data could not be loaded, but you can upload fresh statements.");
  }
}

function persistStatements() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.statements));
  } catch (error) {
    console.error(error);
    setStatus(
      "The dashboard updated, but browser storage is full so the data could not be saved permanently."
    );
  }
}

function buildStatementKey(statement) {
  return [
    statement.fileName,
    statement.statementPeriod,
    statement.accountNumber,
    statement.statementKind,
  ].join("::");
}

function buildArchivedStatementPayload(statement) {
  return {
    fileName: statement.fileName,
    statementPeriod: statement.statementPeriod,
    statementKind: statement.statementKind,
    accountHolder: statement.accountHolder,
    accountType: statement.accountType,
    accountNumber: statement.accountNumber,
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    totalInflow: statement.totalInflow ?? 0,
    totalOutflow: statement.totalOutflow ?? 0,
    serviceFees: statement.serviceFees ?? 0,
    transactions: (statement.transactions || []).map((transaction) => ({
      id: transaction.id,
      dateLabel: transaction.dateLabel,
      isoDate: transaction.isoDate,
      postingDateLabel: transaction.postingDateLabel || "",
      postingIsoDate: transaction.postingIsoDate || "",
      description: transaction.description,
      category: transaction.category,
      flowType: transaction.flowType,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
    })),
  };
}

function isReviewingDraft() {
  return state.draftStatements.length > 0;
}

function getCurrentStatements() {
  return isReviewingDraft() ? state.draftStatements : state.statements;
}

function getCurrentTransactions() {
  return isReviewingDraft() ? state.draftTransactions : state.transactions;
}

function getReviewStatements() {
  return state.draftStatements;
}

function getReviewTransactions() {
  return state.draftTransactions;
}

function clearDraftState() {
  state.draftStatements = [];
  state.draftTransactions = [];
  state.draftFiles = [];
  state.selectedTransactionIds = [];
  state.activeStatementKey = "all";
  state.pendingStatementKind = null;
  resetFilters();
  els.fileInput.value = "";
}

function focusEntryPanel() {
  switchView("new-entry");
  els.entryPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function chooseStatementKind(kind) {
  state.pendingStatementKind = kind;
  render();
}

function changeStatementKind() {
  state.pendingStatementKind = null;
  state.draftStatements = [];
  state.draftTransactions = [];
  state.draftFiles = [];
  state.selectedTransactionIds = [];
  els.fileInput.value = "";
  render();
}

function guessCardLabel(fileName, statement) {
  const baseName = fileName.replace(/\.pdf$/i, "");
  const cleaned = baseName
    .replace(/statement[\s-]*/i, " ")
    .replace(/\d{4}-\d{2}-\d{2}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned) {
    return cleaned;
  }

  if (statement.accountNumber && statement.accountNumber !== "Unavailable") {
    return `${statement.accountType} ${statement.accountNumber}`.trim();
  }

  return statement.accountType;
}

function guessMonthLabel(statementPeriod) {
  const endDate = extractEndDate(statementPeriod);
  if (!endDate) {
    return "";
  }

  const date = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}

function switchView(view) {
  state.activeView = view;
  render();
}

function resetFilters() {
  state.filters.search = "";
  state.filters.category = "";
  state.filters.flow = "";
}

async function archiveUploadedFiles(items) {
  if (!items.length) {
    return "No original PDFs needed archiving.";
  }

  const summaryByMonth = new Map();
  let savedCount = 0;
  let archiveAvailable = true;

  for (const { file, statement } of items) {
    const monthKey = getStatementMonthKey(statement.statementPeriod);
    const statementKey = buildStatementKey(statement);
    const metadata = {
      monthKey,
      statementKey,
      statementPeriod: statement.statementPeriod,
      accountNumber: statement.accountNumber,
      statementKind: statement.statementKind,
      archivedAt: new Date().toISOString(),
      parsedStatement: buildArchivedStatementPayload(statement),
    };

    try {
      const formData = new FormData();
      formData.append("files", file, file.name);
      formData.append("metadata", JSON.stringify(metadata));

      const response = await fetch("/api/archive", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        archiveAvailable = false;
        continue;
      }

      savedCount += 1;
      summaryByMonth.set(monthKey, (summaryByMonth.get(monthKey) || 0) + 1);
    } catch (error) {
      console.error(error);
      archiveAvailable = false;
    }
  }

  if (!archiveAvailable && savedCount === 0) {
    return "File archiving is unavailable until you run `python3 server.py`.";
  }

  const monthSummary = Array.from(summaryByMonth.entries())
    .map(([monthKey, count]) => `${count} file${count === 1 ? "" : "s"} in ${monthKey}`)
    .join(", ");

  if (!archiveAvailable) {
    return `Archived ${savedCount} original PDF${savedCount === 1 ? "" : "s"} locally (${monthSummary}), but some files could not be archived.`;
  }

  return `Archived ${savedCount} original PDF${savedCount === 1 ? "" : "s"} locally${monthSummary ? ` (${monthSummary})` : ""}.`;
}

function populateCategoryOptions() {
  els.bulkCategorySelect.innerHTML = `
    <option value="">Choose category</option>
    ${categoryOptions
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("")}
  `;
  els.categoryFilter.innerHTML = `
    <option value="">All categories</option>
    ${categoryOptions
      .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("")}
  `;
}

function getStatementInflow(statement) {
  return statement.totalInflow ?? statement.totalCredits ?? 0;
}

function getStatementOutflow(statement) {
  return statement.totalOutflow ?? statement.totalCharges ?? 0;
}

function getInflowLabel(statementKind) {
  return statementKind === "credit-card" ? "Credits" : "Deposits";
}

function getOutflowLabel(statementKind) {
  return statementKind === "credit-card" ? "Charges" : "Withdrawals";
}

function formatStatementType(statementKind) {
  return statementKind === "credit-card" ? "Credit card" : "Debit / bank";
}

function getCategoryColor(category) {
  return categoryColorMap[category] || categoryColorMap.Undecided;
}

function renderCategoryBadge(category) {
  const colors = getCategoryColor(category);
  return `
    <span class="category-badge" style="background:${colors.soft}; border-color:${colors.border}; color:${colors.solid};">
      <span class="category-dot" style="background:${colors.solid};"></span>
      ${escapeHtml(category)}
    </span>
  `;
}

function normalizeStatementCategories(statements) {
  const legacyMap = {
    Housing: "Rent & Utilities",
    Dining: "Entertainment & Going Out",
    Transport: "Transportation & Car",
    Shopping: "Shopping & Beauty",
    Bills: "Misc",
    Uncategorized: "Undecided",
  };

  statements.forEach((statement) => {
    statement.transactions = (statement.transactions || []).map((transaction) => ({
      ...transaction,
      category: legacyMap[transaction.category] || transaction.category || "Undecided",
    }));
  });
}

function syncSelection() {
  const validIds = new Set(getReviewTransactions().map((transaction) => transaction.id));
  state.selectedTransactionIds = state.selectedTransactionIds.filter((id) => validIds.has(id));
}

function syncActiveStatementTab() {
  const validKeys = new Set(["all", ...getReviewStatements().map((statement) => buildStatementKey(statement))]);
  if (!validKeys.has(state.activeStatementKey)) {
    state.activeStatementKey = "all";
  }
}

function isTransactionSelected(transactionId) {
  return state.selectedTransactionIds.includes(transactionId);
}

function addSelectedTransaction(transactionId) {
  if (isTransactionSelected(transactionId)) {
    return;
  }
  state.selectedTransactionIds = [...state.selectedTransactionIds, transactionId];
}

function removeSelectedTransaction(transactionId) {
  state.selectedTransactionIds = state.selectedTransactionIds.filter((id) => id !== transactionId);
}

function getStatementTabs() {
  return [...getReviewStatements()];
}

function getVisibleTransactions() {
  return getReviewTransactions().filter((transaction) => {
    if (state.activeStatementKey !== "all") {
      const statementKey = buildStatementKey({
        fileName: transaction.fileName,
        statementPeriod: transaction.statementPeriod,
        accountNumber: findStatementAccountNumber(transaction),
        statementKind: findStatementKind(transaction),
      });
      if (statementKey !== state.activeStatementKey) {
        return false;
      }
    }

    if (state.filters.category && transaction.category !== state.filters.category) {
      return false;
    }

    if (state.filters.flow && transaction.flowType !== state.filters.flow) {
      return false;
    }

    if (state.filters.search) {
      const haystack = `${transaction.description} ${transaction.dateLabel} ${transaction.fileName}`.toLowerCase();
      if (!haystack.includes(state.filters.search)) {
        return false;
      }
    }

    return true;
  });
}

function findStatementForTransaction(transaction) {
  return getReviewStatements().find(
    (statement) =>
      statement.fileName === transaction.fileName &&
      statement.statementPeriod === transaction.statementPeriod &&
      statement.transactions.some((item) => item.id === transaction.id)
  );
}

function findStatementAccountNumber(transaction) {
  return findStatementForTransaction(transaction)?.accountNumber || "";
}

function findStatementKind(transaction) {
  return findStatementForTransaction(transaction)?.statementKind || "";
}

function findSubmittedStatementKind(transaction) {
  return (
    state.statements.find(
      (statement) =>
        statement.fileName === transaction.fileName &&
        statement.statementPeriod === transaction.statementPeriod &&
        statement.transactions.some((item) => item.id === transaction.id)
    )?.statementKind || ""
  );
}

function shortDateLabel(label) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const date = new Date(`${label}T12:00:00`);
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  return label.replace(", 2026", "").replace(", 2025", "").replace(", 2024", "");
}

function groupBy(items, getKey) {
  return items.reduce((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function setStatus(message) {
  els.status.textContent = message;
}

function setEmpty(element, message) {
  element.className = `${element.id === "transactionTable" ? "table-wrap" : "chart-area"} empty-state`;
  element.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTitleCase(value) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
