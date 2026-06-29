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
  editingStatementId: null,
  activeView: "all-data",
  pendingStatementKind: null,
  viewScope: "month",
  activeMonth: getCurrentMonthKey(),
  activeYear: String(new Date().getFullYear()),
  filters: {
    search: "",
    category: "",
    flow: "",
  },
  timelineFilters: {
    categories: [],
    accounts: [],
    granularity: "day",
    openDropdown: null,
    selectedBucketKey: null,
    ...getCurrentMonthRange(),
  },
  budgets: [],
  budgetMonth: "",
};

const STORAGE_KEY = "my-personal-finance-tracker-statements-v1";
const BUDGETS_STORAGE_KEY = "my-personal-finance-tracker-budgets-v1";

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
  periodSelector: document.querySelector("#periodSelector"),
  periodScopeToggle: document.querySelector("#periodScopeToggle"),
  toast: document.querySelector("#toast"),
  timelineGranularityToggle: document.querySelector("#timelineGranularityToggle"),
  timelineCategoryFilter: document.querySelector("#timelineCategoryFilter"),
  timelineAccountFilter: document.querySelector("#timelineAccountFilter"),
  timelineFromDate: document.querySelector("#timelineFromDate"),
  timelineToDate: document.querySelector("#timelineToDate"),
  timelineFilterClear: document.querySelector("#timelineFilterClear"),
  timelineDayDetail: document.querySelector("#timelineDayDetail"),
  budgetStartMonth: document.querySelector("#budgetStartMonth"),
  budgetCategoryInputs: document.querySelector("#budgetCategoryInputs"),
  budgetIncomeGoal: document.querySelector("#budgetIncomeGoal"),
  budgetAllocationChart: document.querySelector("#budgetAllocationChart"),
  saveBudgetButton: document.querySelector("#saveBudgetButton"),
  clearBudgetFormButton: document.querySelector("#clearBudgetFormButton"),
  budgetVersionList: document.querySelector("#budgetVersionList"),
  budgetMonthSelector: document.querySelector("#budgetMonthSelector"),
  budgetPerformance: document.querySelector("#budgetPerformance"),
  statementCount: document.querySelector("#statementCount"),
  incomeTotal: document.querySelector("#incomeTotal"),
  spendingTotal: document.querySelector("#spendingTotal"),
  netTotal: document.querySelector("#netTotal"),
  statementSections: document.querySelector("#statementSections"),
  manageStatementsList: document.querySelector("#manageStatementsList"),
  incomeGoalCard: document.querySelector("#incomeGoalCard"),
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
  { name: "Food & Alcohol", keywords: ["restaurant", "cafe", "coffee", "starbucks", "tim hortons", "ubereats", "doordash", "skip", "bar", "pub"] },
  { name: "Entertainment", keywords: ["netflix", "spotify", "cineplex", "movie", "theatre", "concert"] },
  { name: "Transportation", keywords: ["uber", "lyft", "shell", "esso", "petro", "transit", "parking", "presto", "gas", "insurance", "garage"] },
  { name: "Travel", keywords: ["air canada", "westjet", "hotel", "airbnb", "booking", "expedia", "flight", "trip"] },
  { name: "Shopping - Clothes & Beauty", keywords: ["sephora", "ulta", "beauty", "clothing", "apparel", "fashion", "cosmetics"] },
  { name: "Shopping - Misc", keywords: ["amazon", "shop", "store", "indigo", "ikea", "marketplace"] },
  { name: "Income", keywords: ["payroll", "salary", "deposit", "interest"] },
];

const debitOnlyCategoryRules = [
  { name: "Credit Card Payment", keywords: ["mastercard", "visa preauth", "visa payment", "amex", "credit card payment", "cc payment", "mc preauth", "card payment"] },
  { name: "Savings", keywords: ["savings transfer", "to savings", "from savings", "tfsa", "rrsp", "investment transfer"] },
];

const categoryColorMap = {
  "Rent & Utilities": { solid: "#7f95ff", soft: "rgba(127, 149, 255, 0.14)", border: "rgba(127, 149, 255, 0.3)" },
  "Food & Alcohol": { solid: "#ff8db1", soft: "rgba(255, 141, 177, 0.14)", border: "rgba(255, 141, 177, 0.3)" },
  Entertainment: { solid: "#9b7fe8", soft: "rgba(155, 127, 232, 0.16)", border: "rgba(155, 127, 232, 0.3)" },
  Transportation: { solid: "#ffb36c", soft: "rgba(255, 179, 108, 0.16)", border: "rgba(255, 179, 108, 0.3)" },
  Travel: { solid: "#6f84f7", soft: "rgba(111, 132, 247, 0.14)", border: "rgba(111, 132, 247, 0.3)" },
  "Shopping - Clothes & Beauty": { solid: "#b457b8", soft: "rgba(180, 87, 184, 0.14)", border: "rgba(180, 87, 184, 0.3)" },
  "Shopping - Misc": { solid: "#f4b942", soft: "rgba(244, 185, 66, 0.16)", border: "rgba(244, 185, 66, 0.3)" },
  Groceries: { solid: "#52c4a8", soft: "rgba(82, 196, 168, 0.16)", border: "rgba(82, 196, 168, 0.3)" },
  Misc: { solid: "#7ec8f4", soft: "rgba(126, 200, 244, 0.16)", border: "rgba(126, 200, 244, 0.3)" },
  Undecided: { solid: "#9f8baa", soft: "rgba(159, 139, 170, 0.14)", border: "rgba(159, 139, 170, 0.28)" },
  Income: { solid: "#2d8a63", soft: "rgba(45, 138, 99, 0.14)", border: "rgba(45, 138, 99, 0.28)" },
  "Credit Card Payment": { solid: "#6c5ce7", soft: "rgba(108, 92, 231, 0.14)", border: "rgba(108, 92, 231, 0.3)" },
  Savings: { solid: "#3fc1c9", soft: "rgba(63, 193, 201, 0.16)", border: "rgba(63, 193, 201, 0.3)" },
};
const categoryOptions = [
  "Shopping - Clothes & Beauty",
  "Shopping - Misc",
  "Food & Alcohol",
  "Entertainment",
  "Groceries",
  "Transportation",
  "Credit Card Payment",
  "Misc",
  "Travel",
  "Income",
  "Savings",
  "Rent & Utilities",
  "Undecided",
];
const budgetExcludedCategories = ["Income", "Credit Card Payment"];
const budgetableCategories = categoryOptions.filter(
  (category) => !budgetExcludedCategories.includes(category)
);

init();

function init() {
  hydrateFromStorage();
  hydrateBudgetsFromStorage();
  populateCategoryOptions();
  populateBudgetCategoryInputs();

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
  els.manageStatementsList.addEventListener("click", handleManageStatementsClick);
  els.manageStatementsList.addEventListener("change", handleManageStatementsChange);
  els.incomeGoalCard.addEventListener("change", handleIncomeGoalInputChange);
  els.transactionTabs.addEventListener("click", handleTransactionTabClick);
  els.searchFilter.addEventListener("input", handleFilterInput);
  els.categoryFilter.addEventListener("change", handleFilterInput);
  els.flowFilter.addEventListener("change", handleFilterInput);
  els.periodSelector.addEventListener("change", handlePeriodSelectorChange);
  els.periodScopeToggle.addEventListener("click", handlePeriodScopeToggleClick);
  els.timelineGranularityToggle.addEventListener("click", handleTimelineGranularityClick);
  els.timelineCategoryFilter.addEventListener("click", handleMultiSelectFilterClick);
  els.timelineCategoryFilter.addEventListener("change", handleMultiSelectFilterChange);
  els.timelineAccountFilter.addEventListener("click", handleMultiSelectFilterClick);
  els.timelineAccountFilter.addEventListener("change", handleMultiSelectFilterChange);
  document.addEventListener("click", handleDocumentClickForDropdowns);
  els.timelineFromDate.addEventListener("change", handleTimelineFilterChange);
  els.timelineToDate.addEventListener("change", handleTimelineFilterChange);
  els.timelineFilterClear.addEventListener("click", handleTimelineFilterClear);
  els.timelineChart.addEventListener("click", handleTimelineChartClick);
  els.timelineDayDetail.addEventListener("click", handleTimelineDayDetailClick);
  els.saveBudgetButton.addEventListener("click", handleSaveBudget);
  els.clearBudgetFormButton.addEventListener("click", handleClearBudgetForm);
  els.budgetVersionList.addEventListener("click", handleBudgetVersionListClick);
  els.budgetMonthSelector.addEventListener("change", handleBudgetMonthChange);
  els.budgetCategoryInputs.addEventListener("input", renderBudgetAllocationChart);
  els.budgetIncomeGoal.addEventListener("input", renderBudgetAllocationChart);
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

  const resolvedCredits = Math.abs(totalCredits ?? creditsFromTransactions);
  const resolvedCharges = Math.abs(totalCharges ?? chargesFromTransactions);
  const resolvedFees = Math.abs(serviceFees ?? feesFromTransactions);

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
    totalCredits: resolvedCredits,
    totalCharges: resolvedCharges,
    serviceFees: resolvedFees,
    totalInflow: resolvedCredits,
    totalOutflow: resolvedCharges,
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
    amount: Math.abs(current.amount),
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
    amount: Math.abs(current.amount),
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
  if (/payment\s*[-–—/]*\s*thank\s*you/i.test(lower)) {
    return "Credit Card Payment";
  }
  if (/(refund|merchant credit|return|reversal|adjustment|cash back|cashback|credit voucher)/i.test(lower)) {
    return "Income";
  }
  if (statementKind !== "credit-card") {
    for (const rule of debitOnlyCategoryRules) {
      if (rule.keywords.some((keyword) => lower.includes(keyword))) {
        return rule.name;
      }
    }
  }
  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      if (statementKind === "credit-card") {
        return rule.name;
      }
      return amount > 0 ? "Income" : rule.name;
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
  renderMonthSelector();
  renderOverview();
  renderIncomeGoalCard();
  renderStatements();
  renderManageStatements();
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
  renderBudgetVersionList();
  renderBudgetMonthSelector();
  renderBudgetPerformance();
  renderBudgetAllocationChart();
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
  const allTransactions = getMonthFilteredTransactions();
  const transactions = excludeInternalTransfers(allTransactions);
  const inflow = sumAmounts(
    transactions
      .filter((transaction) => transaction.flowType === "credit")
      .map((transaction) => Math.abs(transaction.amount))
  );
  const outflow = sumAmounts(
    transactions
      .filter((transaction) => transaction.flowType === "charge")
      .map((transaction) => Math.abs(transaction.amount))
  );
  const netChange = inflow - outflow;

  const isPeriodFiltered = state.viewScope === "year" ? Boolean(state.activeYear) : Boolean(state.activeMonth);
  els.statementCount.textContent = isPeriodFiltered
    ? String(new Set(allTransactions.map((transaction) => transaction.fileName)).size)
    : String(state.statements.length);
  els.incomeTotal.previousElementSibling.textContent = "Total money in";
  els.spendingTotal.previousElementSibling.textContent = "Total money out";
  els.netTotal.previousElementSibling.textContent = "Net change";
  els.incomeTotal.textContent = formatMoney(inflow);
  els.spendingTotal.textContent = formatMoney(outflow);
  els.netTotal.textContent = formatMoney(netChange);
  els.netTotal.className = netChange < 0 ? "amount-negative" : "amount-positive";
}

function renderIncomeGoalCard() {
  const monthKey = state.viewScope === "month" ? state.activeMonth : "";
  if (!monthKey) {
    els.incomeGoalCard.classList.add("hidden");
    els.incomeGoalCard.innerHTML = "";
    return;
  }

  const budget = getEffectiveBudget(monthKey);
  const incomeGoal = budget?.amounts?.Income || 0;
  const spend = sumAmounts(
    excludeInternalTransfers(getMonthFilteredTransactions())
      .filter((transaction) => transaction.flowType === "charge")
      .map((transaction) => Math.abs(transaction.amount))
  );
  const pct = incomeGoal > 0 ? Math.min((spend / incomeGoal) * 100, 100) : 0;
  const isOver = incomeGoal > 0 && spend > incomeGoal;
  const remaining = incomeGoal - spend;

  els.incomeGoalCard.classList.remove("hidden");
  els.incomeGoalCard.innerHTML = `
    <div class="card-heading">
      <div>
        <p class="section-tag">Budget check</p>
        <h2>${escapeHtml(formatMonthLabel(monthKey))} income vs. spending</h2>
      </div>
      <div class="income-goal-input-group">
        <label for="incomeGoalInput">Expected income</label>
        <input id="incomeGoalInput" type="number" min="0" step="0.01" class="filter-input" value="${incomeGoal || ""}" placeholder="0.00" />
      </div>
    </div>
    ${
      incomeGoal > 0
        ? `
          <div class="budget-progress-track">
            <div class="budget-progress-fill ${isOver ? "over-budget" : ""}" style="width:${pct}%;"></div>
          </div>
          <p class="${isOver ? "budget-allocation-warning" : "muted"}">
            ${formatMoney(spend)} spent of ${formatMoney(incomeGoal)} expected
            ${isOver ? `· ${formatMoney(Math.abs(remaining))} over your expected income` : `· ${formatMoney(remaining)} left`}
          </p>
        `
        : `<p class="muted">Set your expected income for ${escapeHtml(formatMonthLabel(monthKey))} to track overspending.</p>`
    }
  `;
}

function handleIncomeGoalInputChange(event) {
  const input = event.target.closest("#incomeGoalInput");
  if (!input) {
    return;
  }
  const monthKey = state.activeMonth;
  const value = Math.max(Number(input.value) || 0, 0);
  let budget = state.budgets.find((item) => item.startMonth === monthKey);
  if (!budget) {
    const inherited = getEffectiveBudget(monthKey);
    budget = { id: crypto.randomUUID(), startMonth: monthKey, amounts: { ...(inherited?.amounts || {}) } };
    state.budgets.push(budget);
    state.budgets.sort((a, b) => a.startMonth.localeCompare(b.startMonth));
  }
  budget.amounts.Income = value;
  persistBudgets();
  render();
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
  const transactions = getMonthFilteredTransactions();
  if (!transactions.length) {
    els.statementSections.className = "stack-list empty-state";
    els.statementSections.textContent =
      "Upload credit card or debit statements to see saved summaries, balances, and parsed sections.";
    return;
  }

  const grouped = groupBy(transactions, (tx) => getTransactionMonthKey(tx) || "unknown");
  const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  els.statementSections.className = "stack-list";
  els.statementSections.innerHTML = monthKeys
    .map((monthKey) => {
      const items = grouped[monthKey];
      const externalItems = excludeInternalTransfers(items);
      const inflow = sumAmounts(externalItems.filter((tx) => tx.flowType === "credit").map((tx) => Math.abs(tx.amount)));
      const outflow = sumAmounts(externalItems.filter((tx) => tx.flowType === "charge").map((tx) => Math.abs(tx.amount)));
      const savings = sumAmounts(items.filter((tx) => tx.category === "Savings").map((tx) => Math.abs(tx.amount)));
      const statementLabels = Array.from(
        new Set(
          items.map((tx) => {
            const statement = findStatementForTransaction(tx);
            return statement ? statement.cardLabel || statement.fileName : tx.fileName;
          })
        )
      );
      const label = monthKey === "unknown" ? "Undated transactions" : formatMonthLabel(monthKey);

      return `
        <article class="statement-card">
          <h3>${escapeHtml(label)}</h3>
          <p>${statementLabels.length} statement${statementLabels.length === 1 ? "" : "s"} combined: ${escapeHtml(statementLabels.join(", "))}</p>
          <div class="section-summary">
            <span class="chip">Money in ${formatMoney(inflow)}</span>
            <span class="chip">Money out ${formatMoney(outflow)}</span>
            <span class="chip">Net ${formatMoney(inflow - outflow)}</span>
            <span class="chip">Savings ${formatMoney(savings)}</span>
            <span class="chip">${items.length} transactions</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function getScopedStatements() {
  const isPeriodFiltered = state.viewScope === "year" ? Boolean(state.activeYear) : Boolean(state.activeMonth);
  if (!isPeriodFiltered) {
    return state.statements;
  }
  const statementIds = new Set(
    getMonthFilteredTransactions()
      .map((tx) => findStatementForTransaction(tx)?.id)
      .filter(Boolean)
  );
  return state.statements.filter((statement) => statementIds.has(statement.id));
}

function renderManageStatements() {
  const scopedStatements = getScopedStatements();
  if (!state.statements.length) {
    els.manageStatementsList.className = "stack-list empty-state";
    els.manageStatementsList.textContent = "Upload credit card or debit statements to manage them here.";
    return;
  }
  if (!scopedStatements.length) {
    els.manageStatementsList.className = "stack-list empty-state";
    els.manageStatementsList.textContent = "No statements in this period. Switch the period above or choose \"All\" to see everything.";
    return;
  }

  els.manageStatementsList.className = "stack-list";
  els.manageStatementsList.innerHTML = [...scopedStatements]
    .sort(sortByPeriod)
    .reverse()
    .map((statement) => {
      const isEditing = state.editingStatementId === statement.id;
      const transactions = statement.transactions || [];
      return `
        <article class="statement-card">
          <div class="card-heading">
            <div>
              <h3>${escapeHtml(statement.cardLabel || statement.fileName)}</h3>
              <p class="muted">${escapeHtml(statement.statementPeriod || "")} · ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}</p>
            </div>
            <div class="statement-meta">
              <button type="button" class="ghost-button compact-button" data-toggle-edit-statement="${escapeHtml(statement.id)}">
                ${isEditing ? "Done editing" : "Edit"}
              </button>
              <button type="button" class="danger-button compact-button" data-delete-statement="${escapeHtml(statement.id)}">
                Delete statement
              </button>
            </div>
          </div>
          ${isEditing ? renderEditableStatementTransactions(statement) : ""}
        </article>
      `;
    })
    .join("");
}

function renderEditableStatementTransactions(statement) {
  const transactions = [...(statement.transactions || [])].sort((a, b) =>
    (a.isoDate || "").localeCompare(b.isoDate || "")
  );

  const rows = transactions
    .map(
      (tx) => `
        <tr>
          <td>
            <input
              type="date"
              class="filter-input"
              data-statement-id="${escapeHtml(statement.id)}"
              data-tx-id="${escapeHtml(tx.id)}"
              data-field="isoDate"
              value="${escapeHtml(tx.isoDate || "")}"
            />
          </td>
          <td>
            <input
              type="text"
              class="filter-input"
              data-statement-id="${escapeHtml(statement.id)}"
              data-tx-id="${escapeHtml(tx.id)}"
              data-field="description"
              value="${escapeHtml(tx.description || "")}"
            />
          </td>
          <td>${renderCategorySelectForEdit(statement.id, tx)}</td>
          <td>
            <select class="category-select" data-statement-id="${escapeHtml(statement.id)}" data-tx-id="${escapeHtml(tx.id)}" data-field="flowType">
              <option value="charge" ${tx.flowType === "charge" ? "selected" : ""}>Money out</option>
              <option value="credit" ${tx.flowType === "credit" ? "selected" : ""}>Money in</option>
            </select>
          </td>
          <td>
            <input
              type="number"
              step="0.01"
              min="0"
              class="filter-input"
              data-statement-id="${escapeHtml(statement.id)}"
              data-tx-id="${escapeHtml(tx.id)}"
              data-field="amount"
              value="${Math.abs(tx.amount ?? 0)}"
            />
          </td>
          <td>
            <button
              type="button"
              class="delete-transaction-button"
              data-delete-edit-tx="${escapeHtml(tx.id)}"
              data-statement-id="${escapeHtml(statement.id)}"
              title="Delete transaction"
              aria-label="Delete transaction"
            >✕</button>
          </td>
        </tr>
      `
    )
    .join("");

  return `
    <div class="table-wrap edit-statement-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Flow</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderCategorySelectForEdit(statementId, tx) {
  const options = categoryOptions
    .map(
      (category) =>
        `<option value="${escapeHtml(category)}" ${tx.category === category ? "selected" : ""}>${escapeHtml(category)}</option>`
    )
    .join("");
  return `<select class="category-select" data-statement-id="${escapeHtml(statementId)}" data-tx-id="${escapeHtml(tx.id)}" data-field="category">${options}</select>`;
}

function recalculateStatementTotals(statement) {
  statement.totalCredits = sumAmounts(
    (statement.transactions || []).filter((tx) => tx.flowType === "credit").map((tx) => Math.abs(tx.amount))
  );
  statement.totalCharges = sumAmounts(
    (statement.transactions || []).filter((tx) => tx.flowType === "charge").map((tx) => Math.abs(tx.amount))
  );
  statement.serviceFees = sumAmounts(
    (statement.transactions || []).filter((tx) => tx.category === "Fees").map((tx) => Math.abs(tx.amount))
  );
}

function formatDateLabelFromIso(isoDate) {
  if (!isoDate) {
    return "";
  }
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString("en-CA", { month: "short", day: "2-digit" });
}

function handleManageStatementsClick(event) {
  const toggleButton = event.target.closest("[data-toggle-edit-statement]");
  if (toggleButton) {
    const id = toggleButton.dataset.toggleEditStatement;
    state.editingStatementId = state.editingStatementId === id ? null : id;
    render();
    return;
  }

  const deleteStatementButton = event.target.closest("[data-delete-statement]");
  if (deleteStatementButton) {
    const id = deleteStatementButton.dataset.deleteStatement;
    const statement = state.statements.find((item) => item.id === id);
    if (!statement) {
      return;
    }
    const label = statement.cardLabel || statement.fileName;
    if (!confirm(`Delete the statement "${label}" and all ${statement.transactions.length} of its transactions?`)) {
      return;
    }
    state.statements = state.statements.filter((item) => item.id !== id);
    state.transactions = state.statements.flatMap((item) => item.transactions || []);
    if (state.editingStatementId === id) {
      state.editingStatementId = null;
    }
    persistStatements();
    setStatus(`Deleted statement ${label}.`);
    render();
    return;
  }

  const deleteTxButton = event.target.closest("[data-delete-edit-tx]");
  if (deleteTxButton) {
    const statementId = deleteTxButton.dataset.statementId;
    const txId = deleteTxButton.dataset.deleteEditTx;
    const statement = state.statements.find((item) => item.id === statementId);
    if (!statement) {
      return;
    }
    statement.transactions = (statement.transactions || []).filter((tx) => tx.id !== txId);
    recalculateStatementTotals(statement);
    state.transactions = state.statements.flatMap((item) => item.transactions || []);
    persistStatements();
    setStatus("Deleted transaction.");
    render();
  }
}

function handleManageStatementsChange(event) {
  const field = event.target.dataset.field;
  if (!field) {
    return;
  }
  const statement = state.statements.find((item) => item.id === event.target.dataset.statementId);
  const transaction = statement?.transactions.find((tx) => tx.id === event.target.dataset.txId);
  if (!statement || !transaction) {
    return;
  }

  if (field === "amount") {
    transaction.amount = Math.abs(parseFloat(event.target.value) || 0);
  } else if (field === "isoDate") {
    transaction.isoDate = event.target.value;
    transaction.dateLabel = formatDateLabelFromIso(event.target.value);
  } else {
    transaction[field] = event.target.value;
  }

  recalculateStatementTotals(statement);
  state.transactions = state.statements.flatMap((item) => item.transactions || []);
  persistStatements();
  render();
}

function renderFlowChart() {
  if (!state.statements.length) {
    setEmpty(els.flowChart, "Charts will appear after parsing.");
    return;
  }

  const transactions = excludeInternalTransfers(getMonthFilteredTransactions());
  const series = [
    { label: "Money in", value: sumAmounts(transactions.filter((item) => item.flowType === "credit").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #88d5b5, #52c4a8)" },
    { label: "Money out", value: sumAmounts(transactions.filter((item) => item.flowType === "charge").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #ff8db1, #d95b7a)" },
    { label: "Savings", value: sumAmounts(transactions.filter((item) => item.category === "Savings").map((item) => Math.abs(item.amount))), color: "linear-gradient(180deg, #3fc1c9, #2a9aa0)" },
  ];

  const max = Math.max(...series.map((item) => item.value), 1);
  els.flowChart.className = "chart-area";
  els.flowChart.innerHTML = `
    <div class="bar-chart">
      ${series
        .map((item) => {
          const heightPx = Math.max((item.value / max) * 220, 24);
          return `
            <div class="bar-item">
              <div class="bar-value">${formatMoney(item.value)}</div>
              <div class="bar-visual" style="height:${heightPx}px; background:${item.color}; border-radius:${barRadius(heightPx)};"></div>
              <div class="bar-label">${item.label}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCategoryChart() {
  const outflowTransactions = getMonthFilteredTransactions().filter(
    (item) => item.flowType === "charge" && item.category !== "Credit Card Payment"
  );
  if (!outflowTransactions.length) {
    setEmpty(els.categoryChart, "Spending categories will show here.");
    return;
  }

  const grouped = groupBy(outflowTransactions, (item) => item.category);
  const entries = Object.entries(grouped)
    .map(([name, items]) => ({
      name,
      value: sumAmounts(items.map((item) => Math.abs(item.amount))),
    }))
    .sort((a, b) => b.value - a.value);

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
          <span>Total spending</span>
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
  const debitStatements = state.statements.filter((statement) => statement.statementKind !== "credit-card");
  if (!debitStatements.length) {
    setEmpty(els.balanceChart, "Closing balances will be graphed here.");
    return;
  }

  const points = debitStatements.map((statement, index) => {
    const dateLabel = compactLabel(statement.statementPeriod, statement.cardLabel || statement.fileName);
    const accountHint = statement.accountNumber || "Bank";
    return {
      label: `${dateLabel} · ${accountHint}`,
      value: statement.closingBalance,
      index,
    };
  });
  renderLineChart(els.balanceChart, points, "Closing balance");
}

function renderCreditCardSpendChart() {
  const creditCardCharges = state.transactions
    .filter((tx) => tx.flowType === "charge" && findSubmittedStatementKind(tx) === "credit-card")
    .reduce((acc, tx) => {
      const key = getTransactionMonthKey(tx) || "unknown";
      acc[key] = (acc[key] || 0) + Math.abs(tx.amount);
      return acc;
    }, {});

  const entries = Object.entries(creditCardCharges)
    .map(([monthKey, value]) => ({
      label: monthKey === "unknown" ? "Unknown" : formatMonthLabel(monthKey),
      value,
      monthKey,
    }))
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
    .filter((entry) => entry.value > 0);

  if (!entries.length) {
    setEmpty(els.creditCardSpendChart, "Credit card monthly spending will show here.");
    return;
  }

  const max = Math.max(...entries.map((entry) => entry.value), 1);
  els.creditCardSpendChart.className = "chart-area";
  els.creditCardSpendChart.innerHTML = `
    <div class="bar-chart">
      ${entries
        .map((entry) => {
          const heightPx = Math.max((entry.value / max) * 220, 24);
          const isActive = state.activeMonth && entry.monthKey === state.activeMonth;
          const gradient = isActive
            ? "linear-gradient(180deg, #4f5fe0, #8a3fa0)"
            : "linear-gradient(180deg, #6f84f7, #b457b8)";
          const opacity = state.activeMonth && !isActive ? "0.4" : "1";
          return `
            <div class="bar-item" style="opacity:${opacity};">
              <div class="bar-value">${formatMoney(entry.value)}</div>
              <div class="bar-visual" style="height:${heightPx}px; background:${gradient}; border-radius:${barRadius(heightPx)};"></div>
              <div class="bar-label">${escapeHtml(entry.label)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function getTimelineBaseTransactions() {
  return getMonthFilteredTransactions().filter(
    (tx) => tx.flowType === "charge" && tx.category !== "Credit Card Payment"
  );
}

function getCurrentMonthRange() {
  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { fromDate, toDate };
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getWeekStartKey(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function getTimelineBucketKey(tx, granularity) {
  const isoDate = tx.isoDate || "";
  if (!isoDate) {
    return tx.dateLabel;
  }
  if (granularity === "week") {
    return getWeekStartKey(isoDate);
  }
  if (granularity === "month") {
    return isoDate.slice(0, 7);
  }
  return isoDate;
}

function getTimelineBucketLabel(key, granularity) {
  if (granularity === "month") {
    return formatMonthLabel(key);
  }
  if (granularity === "week") {
    return `Week of ${shortDateLabel(key)}`;
  }
  return shortDateLabel(key);
}

function getTimelineAccountKey(statement) {
  if (!statement) {
    return "";
  }
  return statement.accountNumber && statement.accountNumber !== "Unavailable"
    ? statement.accountNumber
    : `file:${statement.fileName}`;
}

function renderMultiSelectFilter(wrapperEl, dropdownKey, options, selectedValues, allLabel) {
  const button = wrapperEl.querySelector(".multi-select-button");
  const menu = wrapperEl.querySelector(".multi-select-menu");
  const isOpen = state.timelineFilters.openDropdown === dropdownKey;

  button.textContent = selectedValues.length
    ? options
        .filter((option) => selectedValues.includes(option.value))
        .map((option) => option.label)
        .join(", ")
    : allLabel;

  menu.classList.toggle("hidden", !isOpen);
  menu.innerHTML =
    options
      .map(
        (option) => `
          <label class="multi-select-option">
            <input type="checkbox" data-dropdown="${dropdownKey}" value="${escapeHtml(option.value)}" ${selectedValues.includes(option.value) ? "checked" : ""} />
            <span>${escapeHtml(option.label)}</span>
          </label>
        `
      )
      .join("") +
    (selectedValues.length
      ? `<div class="multi-select-option multi-select-option-clear" data-clear-dropdown="${dropdownKey}">Clear selection</div>`
      : "");
}

function renderTimelineFilterControls(baseTransactions) {
  const categoryTotals = {};
  const accountMap = new Map();
  baseTransactions.forEach((tx) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + Math.abs(tx.amount);
    const statement = findStatementForTransaction(tx);
    const accountKey = getTimelineAccountKey(statement);
    if (accountKey && !accountMap.has(accountKey)) {
      const accountSuffix =
        statement.accountNumber && statement.accountNumber !== "Unavailable" ? ` (${statement.accountNumber})` : "";
      accountMap.set(accountKey, `${statement.cardLabel || statement.accountType || statement.fileName}${accountSuffix}`);
    }
  });

  const categoryOptionsList = Object.keys(categoryTotals)
    .sort((a, b) => categoryTotals[b] - categoryTotals[a])
    .map((category) => ({ value: category, label: category }));
  renderMultiSelectFilter(
    els.timelineCategoryFilter,
    "category",
    categoryOptionsList,
    state.timelineFilters.categories,
    "All categories"
  );

  const accountOptionsList = Array.from(accountMap.entries()).map(([accountKey, label]) => ({
    value: accountKey,
    label,
  }));
  renderMultiSelectFilter(
    els.timelineAccountFilter,
    "account",
    accountOptionsList,
    state.timelineFilters.accounts,
    "All accounts"
  );

  els.timelineFromDate.value = state.timelineFilters.fromDate;
  els.timelineToDate.value = state.timelineFilters.toDate;

  els.timelineGranularityToggle.querySelectorAll("[data-granularity]").forEach((button) => {
    button.classList.toggle("active", button.dataset.granularity === state.timelineFilters.granularity);
  });
}

function renderTimelineChart() {
  const baseTransactions = getTimelineBaseTransactions();
  renderTimelineFilterControls(baseTransactions);

  const { categories, accounts, granularity, fromDate, toDate } = state.timelineFilters;
  const transactions = baseTransactions.filter((tx) => {
    if (categories.length && !categories.includes(tx.category)) {
      return false;
    }
    if (accounts.length && !accounts.includes(getTimelineAccountKey(findStatementForTransaction(tx)))) {
      return false;
    }
    if (fromDate && (tx.isoDate || "") < fromDate) {
      return false;
    }
    if (toDate && (tx.isoDate || "") > toDate) {
      return false;
    }
    return true;
  });

  if (!transactions.length) {
    setEmpty(els.timelineChart, "No spending matches the current timeline filters.");
    els.timelineDayDetail.classList.add("hidden");
    return;
  }

  const buckets = {};
  const txByBucket = {};
  transactions.forEach((tx) => {
    const key = getTimelineBucketKey(tx, granularity);
    buckets[key] = buckets[key] || {};
    buckets[key][tx.category] = (buckets[key][tx.category] || 0) + Math.abs(tx.amount);
    txByBucket[key] = txByBucket[key] || [];
    txByBucket[key].push(tx);
  });

  const days = Object.entries(buckets)
    .map(([key, categories]) => ({
      key,
      label: getTimelineBucketLabel(key, granularity),
      categories,
      total: sumAmounts(Object.values(categories)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const categoryTotals = {};
  days.forEach((day) => {
    Object.entries(day.categories).forEach(([cat, amount]) => {
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
    });
  });
  const categoryOrder = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const max = Math.max(...days.map((day) => day.total), 1);
  const totalSpend = sumAmounts(days.map((day) => day.total));
  const avgPerActiveBucket = totalSpend / days.length;
  const peakDay = days.reduce((best, day) => (day.total > best.total ? day : best), days[0]);
  const bucketNoun = granularity === "month" ? "month" : granularity === "week" ? "week" : "day";

  if (state.timelineFilters.selectedBucketKey && !buckets[state.timelineFilters.selectedBucketKey]) {
    state.timelineFilters.selectedBucketKey = null;
  }

  els.timelineChart.className = "chart-area";
  els.timelineChart.innerHTML = `
    <div class="timeline-stats">
      <span class="chip">Total ${formatMoney(totalSpend)}</span>
      <span class="chip">Avg / active ${bucketNoun} ${formatMoney(avgPerActiveBucket)}</span>
      <span class="chip">Peak ${bucketNoun} ${escapeHtml(peakDay.label)} · ${formatMoney(peakDay.total)}</span>
    </div>
    <div class="timeline-chart">
      ${days
        .map((day) => {
          const heightPx = Math.max((day.total / max) * 220, 24);
          const safeTop = Math.min(18, heightPx / 2);
          const safeBottom = Math.min(8, heightPx / 2);
          const dayEntries = categoryOrder.filter((cat) => day.categories[cat]);
          const segments = dayEntries
            .map((cat, index) => {
              const amount = day.categories[cat];
              const segmentHeightPct = day.total > 0 ? (amount / day.total) * 100 : 0;
              const isFirst = index === 0;
              const isLast = index === dayEntries.length - 1;
              const radius = `${isFirst ? `${safeTop}px ${safeTop}px` : "0 0"} ${isLast ? `${safeBottom}px ${safeBottom}px` : "0 0"}`;
              const shareLabel = Math.round(segmentHeightPct);
              return `<div class="timeline-segment" style="height:${segmentHeightPct}%; background:${getCategoryColor(cat).solid}; border-radius:${radius};" data-tooltip="${escapeHtml(cat)}: ${formatMoney(amount)} (${shareLabel}% of ${bucketNoun})"></div>`;
            })
            .join("");
          const isSelected = state.timelineFilters.selectedBucketKey === day.key;
          return `
            <div class="timeline-bar ${isSelected ? "selected" : ""}" data-bucket-key="${escapeHtml(day.key)}" title="Click to see transactions">
              <div class="timeline-value">${formatMoney(day.total)}</div>
              <div class="timeline-visual" style="height:${heightPx}px; display:flex; flex-direction:column;">
                ${segments}
              </div>
              <div class="timeline-label">${escapeHtml(day.label)}</div>
            </div>
          `;
        })
        .join("")}
    </div>
    <div class="legend timeline-legend">
      ${categoryOrder
        .map(
          (cat) => `
            <div class="legend-item">
              <div class="legend-name">
                <span class="swatch" style="background:${getCategoryColor(cat).solid}"></span>
                <span>${escapeHtml(cat)}</span>
              </div>
              <strong>${formatMoney(categoryTotals[cat])}</strong>
            </div>
          `
        )
        .join("")}
    </div>
  `;

  renderTimelineDayDetail(txByBucket, days);
}

function renderTimelineDayDetail(txByBucket, days) {
  const selectedKey = state.timelineFilters.selectedBucketKey;
  if (!selectedKey || !txByBucket[selectedKey]) {
    els.timelineDayDetail.classList.add("hidden");
    els.timelineDayDetail.innerHTML = "";
    return;
  }

  const day = days.find((item) => item.key === selectedKey);
  const txs = [...txByBucket[selectedKey]].sort((a, b) => (b.isoDate || "").localeCompare(a.isoDate || ""));

  els.timelineDayDetail.classList.remove("hidden");
  els.timelineDayDetail.innerHTML = `
    <div class="day-detail-heading">
      <h3>${escapeHtml(day.label)} <span class="muted">· ${txs.length} transaction${txs.length === 1 ? "" : "s"} · ${formatMoney(day.total)}</span></h3>
      <button type="button" class="ghost-button compact-button" data-close-day-detail>Close</button>
    </div>
    <div class="table-wrap day-detail-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th>Statement</th>
          </tr>
        </thead>
        <tbody>
          ${txs
            .map(
              (tx) => `
                <tr>
                  <td>${escapeHtml(tx.dateLabel)}</td>
                  <td>${escapeHtml(tx.description)}</td>
                  <td>${renderCategoryBadge(tx.category)}</td>
                  <td class="amount-negative">${formatMoney(tx.amount)}</td>
                  <td>${escapeHtml(tx.fileName)}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function handleTimelineChartClick(event) {
  const bar = event.target.closest("[data-bucket-key]");
  if (!bar) {
    return;
  }
  const key = bar.dataset.bucketKey;
  state.timelineFilters.selectedBucketKey = state.timelineFilters.selectedBucketKey === key ? null : key;
  renderTimelineChart();
}

function handleTimelineDayDetailClick(event) {
  if (event.target.closest("[data-close-day-detail]")) {
    state.timelineFilters.selectedBucketKey = null;
    renderTimelineChart();
  }
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
  const midValue = (max + min) / 2;
  const midY = height - pad - ((midValue - min) / Math.max(max - min, 1)) * (height - pad * 2);

  container.className = "chart-area";
  container.innerHTML = `
    <div class="line-chart-wrap">
      <div class="line-y-axis">
        <span>${formatMoney(max)}</span>
        <span>${formatMoney(midValue)}</span>
        <span>${formatMoney(min)}</span>
      </div>
      <div class="line-chart-body">
        <svg viewBox="0 0 ${width} ${height}" class="line-svg" aria-label="${escapeHtml(label)}">
          <line x1="${pad}" y1="${pad}" x2="${width - pad}" y2="${pad}" class="grid-line"></line>
          <line x1="${pad}" y1="${midY}" x2="${width - pad}" y2="${midY}" class="grid-line"></line>
          <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="grid-line"></line>
          <path d="${areaPath}" class="line-area"></path>
          <path d="${path}" class="line-path"></path>
          ${mapped.map((point) => `<circle class="point" cx="${point.x}" cy="${point.y}" r="6"></circle>`).join("")}
        </svg>
        <div class="axis-labels">
          ${mapped.map((point) => `<span>${escapeHtml(point.label)}</span>`).join("")}
        </div>
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

function handlePeriodSelectorChange() {
  if (state.viewScope === "year") {
    state.activeYear = els.periodSelector.value;
  } else {
    state.activeMonth = els.periodSelector.value;
  }
  render();
}

function handlePeriodScopeToggleClick(event) {
  const button = event.target.closest("[data-scope]");
  if (!button) {
    return;
  }
  state.viewScope = button.dataset.scope;
  render();
}

function handleTimelineGranularityClick(event) {
  const button = event.target.closest("[data-granularity]");
  if (!button) {
    return;
  }
  state.timelineFilters.granularity = button.dataset.granularity;
  renderTimelineChart();
}

function handleTimelineFilterChange() {
  state.timelineFilters.fromDate = els.timelineFromDate.value;
  state.timelineFilters.toDate = els.timelineToDate.value;
  renderTimelineChart();
}

function handleTimelineFilterClear() {
  state.timelineFilters = {
    categories: [],
    accounts: [],
    granularity: "day",
    openDropdown: null,
    ...getCurrentMonthRange(),
  };
  renderTimelineChart();
}

function handleMultiSelectFilterClick(event) {
  const button = event.target.closest(".multi-select-button");
  if (button) {
    const wrapper = button.closest(".multi-select");
    const dropdownKey = wrapper === els.timelineCategoryFilter ? "category" : "account";
    state.timelineFilters.openDropdown = state.timelineFilters.openDropdown === dropdownKey ? null : dropdownKey;
    event.stopPropagation();
    renderTimelineChart();
    return;
  }

  const clearOption = event.target.closest("[data-clear-dropdown]");
  if (clearOption) {
    if (clearOption.dataset.clearDropdown === "category") {
      state.timelineFilters.categories = [];
    } else {
      state.timelineFilters.accounts = [];
    }
    event.stopPropagation();
    renderTimelineChart();
  }
}

function handleMultiSelectFilterChange(event) {
  const checkbox = event.target.closest('input[type="checkbox"][data-dropdown]');
  if (!checkbox) {
    return;
  }
  const list =
    checkbox.dataset.dropdown === "category" ? state.timelineFilters.categories : state.timelineFilters.accounts;
  const index = list.indexOf(checkbox.value);
  if (checkbox.checked && index === -1) {
    list.push(checkbox.value);
  } else if (!checkbox.checked && index !== -1) {
    list.splice(index, 1);
  }
  renderTimelineChart();
}

function handleDocumentClickForDropdowns(event) {
  if (!state.timelineFilters.openDropdown) {
    return;
  }
  if (event.target.closest(".multi-select")) {
    return;
  }
  state.timelineFilters.openDropdown = null;
  renderTimelineChart();
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
  persistStatements("Saved data cleared from this browser");
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
        createDemoTx("May 02", "Payment Thank You", -2140, 980.41, "Credit Card Payment", "credit", "2026-05-02"),
        createDemoTx("May 03", "Metro Grocery", 138.42, 1118.83, "Groceries", "charge", "2026-05-03"),
        createDemoTx("May 04", "Tim Hortons", 11.58, 1130.41, "Food & Alcohol", "charge", "2026-05-04"),
        createDemoTx("May 08", "Air Canada", 650, 1780.41, "Travel", "charge", "2026-05-08"),
        createDemoTx("May 10", "Shell Fuel", 72.16, 1852.57, "Transportation", "charge", "2026-05-10"),
        createDemoTx("May 14", "Amazon Marketplace", 88.34, 1940.91, "Shopping - Misc", "charge", "2026-05-14"),
        createDemoTx("May 21", "Interest Charge", 16.95, 1957.86, "Misc", "charge", "2026-05-21"),
        createDemoTx("May 23", "Uber Trip", 24.03, 1981.89, "Transportation", "charge", "2026-05-23"),
        createDemoTx("May 25", "Starbucks", 8.42, 1990.31, "Food & Alcohol", "charge", "2026-05-25"),
        createDemoTx("May 28", "Return Credit", -45, 1945.31, "Income", "credit", "2026-05-28"),
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
        createDemoTx("Jun 02", "Payment Thank You", -2300, 2175.18, "Credit Card Payment", "credit", "2026-06-02"),
        createDemoTx("Jun 03", "FreshCo Grocery", 121.77, 2296.95, "Groceries", "charge", "2026-06-03"),
        createDemoTx("Jun 12", "Uber Eats", 42.14, 2339.09, "Food & Alcohol", "charge", "2026-06-12"),
        createDemoTx("Jun 20", "Costco", 184.61, 2523.70, "Groceries", "charge", "2026-06-20"),
        createDemoTx("Jun 21", "Interest Charge", 16.95, 2540.65, "Misc", "charge", "2026-06-21"),
        createDemoTx("Jun 24", "Petro Canada", 68.90, 2609.55, "Transportation", "charge", "2026-06-24"),
        createDemoTx("Jun 27", "WestJet", 525.48, 3135.03, "Travel", "charge", "2026-06-27"),
        createDemoTx("Jun 29", "Amazon Marketplace", 91.44, 3226.47, "Shopping - Misc", "charge", "2026-06-29"),
        createDemoTx("Jun 30", "Refund Credit", -50, 3176.47, "Income", "credit", "2026-06-30"),
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
        createDemoTx("Jun 14", "Shell Fuel", -74.88, 1850.90, "Transportation", "charge", "2026-06-14"),
        createDemoTx("Jun 15", "Payroll Deposit", 1625, 3475.90, "Income", "credit", "2026-06-15"),
        createDemoTx("Jun 18", "Costco", -210.45, 3265.45, "Groceries", "charge", "2026-06-18"),
        createDemoTx("Jun 23", "Service Fee", -11.95, 3253.50, "Misc", "charge", "2026-06-23"),
        createDemoTx("Jun 26", "Amazon Marketplace", -64.63, 3188.87, "Shopping - Misc", "charge", "2026-06-26"),
      ],
    },
  ];

  state.statements.forEach((statement) => {
    statement.transactions.forEach((transaction) => {
      transaction.fileName = statement.fileName;
      transaction.statementPeriod = statement.statementPeriod;
    });
  });

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

function getTransactionMonthKey(transaction) {
  return (transaction.isoDate || "").slice(0, 7);
}

function getAvailableMonths() {
  const months = new Set(
    state.transactions.map((transaction) => getTransactionMonthKey(transaction)).filter(Boolean)
  );
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) {
    return monthKey;
  }
  return new Date(year, month - 1, 1).toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
  });
}

function getMonthFilteredTransactions() {
  if (state.viewScope === "year") {
    if (!state.activeYear) {
      return state.transactions;
    }
    return state.transactions.filter(
      (transaction) => (getTransactionMonthKey(transaction) || "").slice(0, 4) === state.activeYear
    );
  }
  if (!state.activeMonth) {
    return state.transactions;
  }
  return state.transactions.filter(
    (transaction) => getTransactionMonthKey(transaction) === state.activeMonth
  );
}

function excludeInternalTransfers(transactions) {
  return transactions.filter((transaction) => transaction.category !== "Credit Card Payment");
}

function getAvailableYears() {
  const years = new Set(
    state.transactions.map((transaction) => (getTransactionMonthKey(transaction) || "").slice(0, 4)).filter(Boolean)
  );
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

function renderMonthSelector() {
  els.periodScopeToggle.querySelectorAll("[data-scope]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scope === state.viewScope);
  });

  if (state.viewScope === "year") {
    const years = Array.from(new Set([...getAvailableYears(), state.activeYear].filter(Boolean))).sort((a, b) =>
      b.localeCompare(a)
    );
    els.periodSelector.innerHTML =
      `<option value="">All years</option>` +
      years.map((year) => `<option value="${year}">${escapeHtml(year)}</option>`).join("");
    els.periodSelector.value = state.activeYear;
    return;
  }

  const months = Array.from(new Set([...getAvailableMonths(), state.activeMonth].filter(Boolean))).sort((a, b) =>
    b.localeCompare(a)
  );
  els.periodSelector.innerHTML =
    `<option value="">All months</option>` +
    months
      .map((monthKey) => `<option value="${monthKey}">${escapeHtml(formatMonthLabel(monthKey))}</option>`)
      .join("");
  els.periodSelector.value = state.activeMonth;
}

function populateBudgetCategoryInputs() {
  els.budgetCategoryInputs.innerHTML = budgetableCategories
    .map(
      (category, index) => `
        <div class="budget-category-field">
          <label for="budgetAmount-${index}">
            <span class="swatch" style="background:${getCategoryColor(category).solid}"></span>
            ${escapeHtml(category)}
          </label>
          <input id="budgetAmount-${index}" type="number" min="0" step="1" placeholder="0" data-category="${escapeHtml(category)}" />
        </div>
      `
    )
    .join("");
}

function getBudgetFormValues() {
  const amounts = {};
  els.budgetCategoryInputs.querySelectorAll("input[data-category]").forEach((input) => {
    amounts[input.dataset.category] = Number(input.value) || 0;
  });
  amounts.Income = Number(els.budgetIncomeGoal.value) || 0;
  return {
    startMonth: els.budgetStartMonth.value,
    amounts,
  };
}

function setBudgetFormValues(budget) {
  els.budgetStartMonth.value = budget?.startMonth || "";
  els.budgetCategoryInputs.querySelectorAll("input[data-category]").forEach((input) => {
    const amount = budget?.amounts?.[input.dataset.category] || 0;
    input.value = amount ? String(amount) : "";
  });
  const incomeGoal = budget?.amounts?.Income || 0;
  els.budgetIncomeGoal.value = incomeGoal ? String(incomeGoal) : "";
  renderBudgetAllocationChart();
}

function renderBudgetAllocationChart() {
  const { amounts } = getBudgetFormValues();
  const incomeGoal = amounts.Income || 0;
  const spendingEntries = budgetableCategories
    .map((category) => ({ category, value: amounts[category] || 0 }))
    .filter((entry) => entry.value > 0);

  if (!spendingEntries.length && !incomeGoal) {
    setEmpty(
      els.budgetAllocationChart,
      "Enter a monthly income goal and some category amounts to see the breakdown."
    );
    return;
  }

  const totalSpending = sumAmounts(spendingEntries.map((entry) => entry.value));
  const overAllocated = incomeGoal > 0 && totalSpending > incomeGoal;
  const denominator = incomeGoal > 0 && !overAllocated ? incomeGoal : totalSpending;

  let offset = 0;
  const segments = spendingEntries.map((entry) => {
    const start = offset;
    const sharePct = denominator > 0 ? (entry.value / denominator) * 100 : 0;
    offset = Math.min(offset + sharePct, 100);
    return { ...entry, start, end: offset, sharePct };
  });

  const unallocatedPct = incomeGoal > 0 ? Math.max(100 - offset, 0) : 0;
  const gradientParts = segments
    .map((segment) => `${getCategoryColor(segment.category).solid} ${segment.start.toFixed(2)}% ${segment.end.toFixed(2)}%`)
    .join(", ");
  const gradient = !gradientParts
    ? "rgba(117, 71, 139, 0.12)"
    : unallocatedPct > 0
      ? `${gradientParts}, rgba(117, 71, 139, 0.12) ${offset.toFixed(2)}% 100%`
      : gradientParts;

  els.budgetAllocationChart.className = "chart-area";
  els.budgetAllocationChart.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${gradient});">
        <div class="donut-center">
          <strong>${formatMoney(totalSpending)}</strong>
          <span>${incomeGoal > 0 ? `of ${formatMoney(incomeGoal)} income` : "budgeted"}</span>
        </div>
      </div>
      <div class="legend">
        ${segments
          .map(
            (segment) => `
              <div class="legend-item">
                <div class="legend-name">
                  <span class="swatch" style="background:${getCategoryColor(segment.category).solid}"></span>
                  <span>${escapeHtml(segment.category)}</span>
                </div>
                <strong>${formatMoney(segment.value)} (${Math.round(segment.sharePct)}%)</strong>
              </div>
            `
          )
          .join("")}
        ${
          incomeGoal > 0 && unallocatedPct > 0.5
            ? `<div class="legend-item">
                <div class="legend-name">
                  <span class="swatch" style="background:rgba(117, 71, 139, 0.35)"></span>
                  <span>Unallocated</span>
                </div>
                <strong>${formatMoney(Math.max(incomeGoal - totalSpending, 0))} (${Math.round(unallocatedPct)}%)</strong>
              </div>`
            : ""
        }
      </div>
    </div>
    ${
      overAllocated
        ? `<p class="budget-allocation-warning">You've budgeted ${formatMoney(totalSpending - incomeGoal)} more than your income goal.</p>`
        : ""
    }
  `;
}

function handleSaveBudget() {
  const { startMonth, amounts } = getBudgetFormValues();
  if (!startMonth) {
    setStatus("Choose a start month before saving a budget.");
    return;
  }

  const existing = state.budgets.find((budget) => budget.startMonth === startMonth);
  if (existing) {
    existing.amounts = amounts;
  } else {
    state.budgets.push({ id: crypto.randomUUID(), startMonth, amounts });
  }
  state.budgets.sort((a, b) => a.startMonth.localeCompare(b.startMonth));
  state.budgetMonth = startMonth;
  persistBudgets(`Budget saved for ${formatMonthLabel(startMonth)} onward`);
  render();
}

function handleClearBudgetForm() {
  setBudgetFormValues(null);
}

function handleBudgetVersionListClick(event) {
  const editButton = event.target.closest("[data-edit-budget-id]");
  if (editButton) {
    const budget = state.budgets.find((item) => item.id === editButton.dataset.editBudgetId);
    if (budget) {
      setBudgetFormValues(budget);
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-budget-id]");
  if (deleteButton) {
    state.budgets = state.budgets.filter((item) => item.id !== deleteButton.dataset.deleteBudgetId);
    persistBudgets("Budget removed");
    render();
  }
}

function handleBudgetMonthChange() {
  state.budgetMonth = els.budgetMonthSelector.value;
  renderBudgetPerformance();
}

function getEffectiveBudget(monthKey) {
  let effective = null;
  for (const budget of state.budgets) {
    if (budget.startMonth <= monthKey) {
      effective = budget;
    }
  }
  return effective;
}

function getBudgetMonthOptions() {
  const months = new Set([...getAvailableMonths(), ...state.budgets.map((budget) => budget.startMonth)]);
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

function getMonthCategorySpend(monthKey) {
  const spend = {};
  state.transactions.forEach((transaction) => {
    if (transaction.flowType !== "charge" || getTransactionMonthKey(transaction) !== monthKey) {
      return;
    }
    spend[transaction.category] = (spend[transaction.category] || 0) + Math.abs(transaction.amount);
  });
  return spend;
}

function getMonthIncomeActual(monthKey) {
  return sumAmounts(
    state.transactions
      .filter(
        (transaction) => transaction.category === "Income" && getTransactionMonthKey(transaction) === monthKey
      )
      .map((transaction) => Math.abs(transaction.amount))
  );
}

function renderBudgetVersionList() {
  if (!state.budgets.length) {
    els.budgetVersionList.className = "stack-list empty-state";
    els.budgetVersionList.textContent = "No budgets saved yet.";
    return;
  }

  els.budgetVersionList.className = "stack-list";
  els.budgetVersionList.innerHTML = [...state.budgets]
    .sort((a, b) => b.startMonth.localeCompare(a.startMonth))
    .map((budget) => {
      const total = sumAmounts(budgetableCategories.map((category) => budget.amounts[category] || 0));
      const incomeGoal = budget.amounts.Income || 0;
      return `
        <article class="budget-version-card">
          <div class="budget-version-meta">
            <h3>Effective from ${escapeHtml(formatMonthLabel(budget.startMonth))}</h3>
            <p>Total budgeted ${formatMoney(total)}${incomeGoal ? ` · Income goal ${formatMoney(incomeGoal)}` : ""}</p>
          </div>
          <div class="budget-version-actions">
            <button class="ghost-button compact-button" type="button" data-edit-budget-id="${budget.id}">Edit</button>
            <button class="danger-button compact-button" type="button" data-delete-budget-id="${budget.id}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBudgetMonthSelector() {
  const months = getBudgetMonthOptions();
  if (!months.length) {
    els.budgetMonthSelector.innerHTML = "";
    state.budgetMonth = "";
    return;
  }

  if (!state.budgetMonth || !months.includes(state.budgetMonth)) {
    state.budgetMonth = months[0];
  }

  els.budgetMonthSelector.innerHTML = months
    .map((monthKey) => `<option value="${monthKey}">${escapeHtml(formatMonthLabel(monthKey))}</option>`)
    .join("");
  els.budgetMonthSelector.value = state.budgetMonth;
}

function renderBudgetPerformance() {
  const monthKey = state.budgetMonth;
  if (!monthKey) {
    els.budgetPerformance.className = "stack-list empty-state";
    els.budgetPerformance.textContent = "Set a budget above to see how you're tracking.";
    return;
  }

  const budget = getEffectiveBudget(monthKey);
  const spend = getMonthCategorySpend(monthKey);

  if (!budget) {
    els.budgetPerformance.className = "stack-list empty-state";
    els.budgetPerformance.textContent = `No budget was set yet for ${formatMonthLabel(
      monthKey
    )}. Save a budget above with a start month on or before this one.`;
    return;
  }

  const incomeGoal = budget.amounts.Income || 0;
  const incomeActual = getMonthIncomeActual(monthKey);

  const rows = budgetableCategories.filter(
    (category) => (budget.amounts[category] || 0) > 0 || (spend[category] || 0) > 0
  );

  if (!rows.length && !incomeGoal && !incomeActual) {
    els.budgetPerformance.className = "stack-list empty-state";
    els.budgetPerformance.textContent = `No budgeted categories or spending found for ${formatMonthLabel(monthKey)}.`;
    return;
  }

  let incomeHtml = "";
  if (incomeGoal || incomeActual) {
    const incomePct = incomeGoal > 0 ? Math.min((incomeActual / incomeGoal) * 100, 100) : 100;
    const metGoal = incomeGoal === 0 || incomeActual >= incomeGoal;
    const incomeDiff = incomeActual - incomeGoal;
    incomeHtml = `
      <div class="budget-row income-row">
        <div class="budget-row-header">
          <h4>Income</h4>
          <span class="budget-row-amounts ${!metGoal ? "budget-status-over" : ""}">
            ${formatMoney(incomeActual)} of ${formatMoney(incomeGoal)} goal
            ${incomeGoal > 0 ? `· ${incomeDiff >= 0 ? formatMoney(incomeDiff) + " above goal" : formatMoney(Math.abs(incomeDiff)) + " short of goal"}` : ""}
          </span>
        </div>
        <div class="budget-progress-track">
          <div class="budget-progress-fill ${!metGoal ? "over-budget" : ""}" style="width:${incomePct}%;"></div>
        </div>
      </div>
    `;
  }

  let totalBudgeted = 0;
  let totalSpent = 0;

  const rowsHtml = rows
    .map((category) => {
      const budgeted = budget.amounts[category] || 0;
      const spent = spend[category] || 0;
      totalBudgeted += budgeted;
      totalSpent += spent;
      const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 100;
      const isOver = budgeted > 0 && spent > budgeted;
      const remaining = budgeted - spent;
      const noBudgetSet = budgeted === 0;
      return `
        <div class="budget-row ${noBudgetSet ? "no-budget-set" : ""}">
          <div class="budget-row-header">
            <h4>${escapeHtml(category)}</h4>
            <span class="budget-row-amounts ${isOver ? "budget-status-over" : ""}">
              ${formatMoney(spent)} of ${formatMoney(budgeted)}
              ${budgeted > 0 ? `· ${remaining >= 0 ? formatMoney(remaining) + " left" : formatMoney(Math.abs(remaining)) + " over"}` : ""}
            </span>
          </div>
          <div class="budget-progress-track">
            <div class="budget-progress-fill ${isOver ? "over-budget" : ""}" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  const overallRemaining = totalBudgeted - totalSpent;
  const summaryHtml = rows.length
    ? `
      <div class="budget-summary-row">
        <span>Total: ${formatMoney(totalSpent)} of ${formatMoney(totalBudgeted)}</span>
        <span class="${overallRemaining < 0 ? "budget-status-over" : ""}">
          ${overallRemaining >= 0 ? formatMoney(overallRemaining) + " left" : formatMoney(Math.abs(overallRemaining)) + " over"}
        </span>
      </div>
    `
    : "";

  els.budgetPerformance.className = "stack-list";
  els.budgetPerformance.innerHTML = `${incomeHtml}${rowsHtml}${summaryHtml}`;
}

function sumAmounts(values) {
  return values.reduce((sum, value) => sum + value, 0);
}

function barRadius(heightPx, topMax = 18, bottomMax = 8) {
  const safeTop = Math.min(topMax, heightPx / 2);
  const safeBottom = Math.min(bottomMax, heightPx / 2);
  return `${safeTop}px ${safeTop}px ${safeBottom}px ${safeBottom}px`;
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
    normalizeStatementAmounts(state.statements);
    state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.statements));
    } catch (error) {
      console.error(error);
    }
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

function persistStatements(toastMessage = "Saved to this browser") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.statements));
    showToast(toastMessage);
  } catch (error) {
    console.error(error);
    setStatus(
      "The dashboard updated, but browser storage is full so the data could not be saved permanently."
    );
    showToast("Storage full — changes weren't saved", "error");
  }
}

function hydrateBudgetsFromStorage() {
  try {
    const saved = localStorage.getItem(BUDGETS_STORAGE_KEY);
    if (!saved) {
      return;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return;
    }
    state.budgets = parsed.sort((a, b) => a.startMonth.localeCompare(b.startMonth));
  } catch (error) {
    console.error(error);
  }
}

function persistBudgets(toastMessage) {
  try {
    localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(state.budgets));
    if (toastMessage) {
      showToast(toastMessage);
    }
  } catch (error) {
    console.error(error);
    showToast("Storage full — budget wasn't saved", "error");
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
    Dining: "Food & Alcohol",
    Transport: "Transportation",
    Shopping: "Shopping - Misc",
    Bills: "Misc",
    Uncategorized: "Undecided",
    "Entertainment & Going Out": "Food & Alcohol",
    "Transportation & Car": "Transportation",
    "Shopping & Beauty": "Shopping - Misc",
    Fees: "Misc",
    Cash: "Misc",
    Credits: "Income",
    "E-Transfer": "Income",
  };

  statements.forEach((statement) => {
    statement.transactions = (statement.transactions || []).map((transaction) => {
      const mapped = legacyMap[transaction.category] || transaction.category || "Undecided";
      return {
        ...transaction,
        category: categoryOptions.includes(mapped) ? mapped : "Undecided",
      };
    });
  });
}

function normalizeStatementAmounts(statements) {
  statements.forEach((statement) => {
    statement.transactions = (statement.transactions || []).map((transaction) => ({
      ...transaction,
      amount: Math.abs(transaction.amount ?? 0),
    }));
    recalculateStatementTotals(statement);
    statement.totalInflow = statement.totalCredits;
    statement.totalOutflow = statement.totalCharges;
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
  return [...state.statements, ...state.draftStatements].find(
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

let toastTimer = null;

function showToast(message, type = "success") {
  els.toast.textContent = message;
  els.toast.className = `toast ${type === "error" ? "toast-error" : ""}`.trim();
  els.toast.classList.remove("hidden");
  requestAnimationFrame(() => {
    els.toast.classList.add("visible");
  });

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("visible");
    setTimeout(() => els.toast.classList.add("hidden"), 250);
  }, 2600);
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
