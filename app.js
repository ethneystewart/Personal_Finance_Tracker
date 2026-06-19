import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

const state = {
  statements: [],
  transactions: [],
  selectedTransactionIds: [],
  activeStatementKey: "all",
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
  bulkCategoryTools: document.querySelector("#bulkCategoryTools"),
  selectionCount: document.querySelector("#selectionCount"),
  selectAllButton: document.querySelector("#selectAllButton"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  bulkCategorySelect: document.querySelector("#bulkCategorySelect"),
  applyCategoryButton: document.querySelector("#applyCategoryButton"),
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
  els.selectAllButton.addEventListener("click", selectVisibleTransactions);
  els.clearSelectionButton.addEventListener("click", clearTransactionSelection);
  els.applyCategoryButton.addEventListener("click", applyBulkCategory);
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

  setStatus(`Reading ${files.length} PDF statement${files.length === 1 ? "" : "s"}...`);

  const parsedStatements = [];
  const archiveResults = [];

  for (const [index, file] of files.entries()) {
    try {
      setStatus(`Extracting text from ${file.name} (${index + 1}/${files.length})...`);
      const text = await extractTextFromPdf(file);
      const statement = parseRbcStatement(text, file.name);
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

  const merged = [...state.statements, ...parsedStatements];
  const byFile = new Map(
    merged.map((statement) => [buildStatementKey(statement), statement])
  );
  state.statements = Array.from(byFile.values()).sort(sortByPeriod);
  state.transactions = state.statements.flatMap((statement) => statement.transactions);
  persistStatements();
  const archiveSummary = await archiveUploadedFiles(archiveResults);
  setStatus(archiveSummary);
  render();
}

async function extractTextFromPdf(file) {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rows = [];

    textContent.items.forEach((item) => {
      if (!("str" in item)) {
        return;
      }

      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const textValue = item.str.trim();

      if (!textValue) {
        return;
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

function parseRbcStatement(text, fileName) {
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

  const statementKind = detectStatementKind(normalizedText, accountType);
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
  const transactions = [];

  lines.forEach((line) => {
    const cleaned = cleanTransactionLine(line);
    const parsed = parseTransactionLine(cleaned, statementPeriod);
    if (!parsed) {
      return;
    }

    const { dateLabel, description, amount, balanceAfter } = parsed;

    if (!description || Number.isNaN(amount)) {
      return;
    }

    const category = categorizeTransaction(description, amount, statementKind);
    const flowType = inferFlowType(description, amount, statementKind, category);
    transactions.push({
      id: crypto.randomUUID(),
      fileName,
      statementPeriod,
      dateLabel,
      isoDate: toApproxIsoDate(dateLabel, statementPeriod),
      description,
      category,
      flowType,
      amount,
      balanceAfter,
    });
  });

  return transactions;
}

function categorizeTransaction(description, amount, statementKind) {
  const lower = description.toLowerCase();
  if (/(payment|refund|credit|return|reversal|adjustment|cash back|cashback)/i.test(lower)) {
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
  renderOverview();
  renderStatements();
  renderFlowChart();
  renderCategoryChart();
  renderBalanceChart();
  renderTimelineChart();
  renderTransactionFilters();
  renderTransactionTabs();
  renderBulkCategoryTools();
  renderTransactionTable();
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
          <h3>${escapeHtml(statement.fileName)}</h3>
          <p>${escapeHtml(formatStatementType(statement.statementKind))} · ${escapeHtml(statement.accountType)} · ${escapeHtml(statement.statementPeriod)}</p>
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
  const outflowTransactions = state.transactions.filter((item) => item.flowType === "charge");
  if (!outflowTransactions.length) {
    setEmpty(els.categoryChart, "Upload statements to classify your spending.");
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
  if (!state.statements.length) {
    setEmpty(els.balanceChart, "Closing balances will be graphed here.");
    return;
  }

  const points = state.statements.map((statement, index) => ({
    label: compactLabel(statement.statementPeriod, statement.fileName),
    value: statement.closingBalance,
    index,
  }));
  renderLineChart(els.balanceChart, points, "Closing balance");
}

function renderTimelineChart() {
  if (!state.transactions.length) {
    setEmpty(els.timelineChart, "Daily or statement-level spending trends will show here.");
    return;
  }

  const buckets = {};
  state.transactions.forEach((tx) => {
    if (tx.flowType !== "charge") {
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
  if (!state.transactions.length) {
    els.bulkCategoryTools.classList.add("hidden");
    els.transactionFilters.classList.add("hidden");
    els.transactionTabs.classList.add("hidden");
    setEmpty(els.transactionTable, "Parsed transactions will be listed here.");
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
          <td>${escapeHtml(tx.description)}</td>
          <td>${renderCategoryBadge(tx.category)}</td>
          <td class="${tx.flowType === "credit" ? "amount-positive" : "amount-negative"}">${formatMoney(tx.amount)}</td>
          <td>${tx.balanceAfter === null ? "—" : formatMoney(tx.balanceAfter)}</td>
          <td>${escapeHtml(tx.fileName)}</td>
        </tr>
      `
    )
    .join("");

  els.transactionTable.className = "table-wrap";
  els.transactionTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Category</th>
          <th>Amount</th>
          <th>Balance After</th>
          <th>Statement</th>
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

function renderTransactionFilters() {
  const hasTransactions = state.transactions.length > 0;
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
          ${escapeHtml(statement.fileName)}
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
  state.statements.forEach((statement) => {
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

  state.transactions = state.statements.flatMap((statement) => statement.transactions || []);
  persistStatements();
  setStatus(
    `Updated ${state.selectedTransactionIds.length} transaction${state.selectedTransactionIds.length === 1 ? "" : "s"} to ${nextCategory}.`
  );
  state.selectedTransactionIds = [];
  render();
}

function clearDashboard() {
  state.statements = [];
  state.transactions = [];
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
  state.selectedTransactionIds = [];
  state.activeStatementKey = "all";
  persistStatements();
  setStatus("Demo data loaded and saved locally. You can still upload your own PDFs anytime.");
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
  if (/(visa|mastercard|credit card|minimum payment|credit limit|available credit)/i.test(text) || /visa|mastercard|credit card/i.test(accountType)) {
    return "credit-card";
  }
  return "bank-account";
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
    .split(/(?=(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}\b)/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function shouldIgnoreLine(line) {
  return /^(page \d+|date description amount|date details amount|transaction details|account summary)$/i.test(
    line.trim()
  );
}

function extractStatementPeriod(text) {
  return (
    firstMatch(text, [
      /statement (?:from|period)\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
      /for the period\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s*(?:to|-)\s*[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
      /([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\s+to\s+[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/i,
    ]) || ""
  );
}

function cleanTransactionLine(line) {
  return line
    .replace(/\s{2,}/g, " ")
    .replace(/\b(CR|DR)\b/gi, "")
    .trim();
}

function parseTransactionLine(line, statementPeriod) {
  const patterns = [
    /^(?<date>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})\s+(?<description>.+?)\s+(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)\s+(?<balance>\(?-?\$?\d[\d,]*\.\d{2}\)?)$/i,
    /^(?<date>(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})\s+(?<description>.+?)\s+(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)$/i,
    /^(?<date>\d{1,2}\/\d{1,2})\s+(?<description>.+?)\s+(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)\s+(?<balance>\(?-?\$?\d[\d,]*\.\d{2}\)?)$/i,
    /^(?<date>\d{1,2}\/\d{1,2})\s+(?<description>.+?)\s+(?<amount>\(?-?\$?\d[\d,]*\.\d{2}\)?)$/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) {
      continue;
    }

    const description = normalizeDescription(match.groups.description);
    if (isNonTransactionDescription(description)) {
      return null;
    }

    return {
      dateLabel: normalizeDateLabel(match.groups.date, statementPeriod),
      description,
      amount: parseMoney(match.groups.amount),
      balanceAfter: match.groups.balance ? parseMoney(match.groups.balance) : null,
    };
  }

  return null;
}

function normalizeDescription(description) {
  return description
    .replace(/\s{2,}/g, " ")
    .replace(/\bPOS\b/gi, "POS")
    .replace(/\bDBT\b/gi, "Debit")
    .trim();
}

function isNonTransactionDescription(description) {
  return /^(opening balance|closing balance|new balance|payments and credits|purchases and debits|total deposits|total withdrawals)$/i.test(
    description
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
  const parts = period.split(/\bto\b|-/i).map((part) => part.trim());
  return parts.length > 1 ? toSortableDate(parts[1]) : "";
}

function toApproxIsoDate(dateLabel, statementPeriod) {
  const year = extractStatementYear(statementPeriod);
  if (!year) {
    return "";
  }
  return toSortableDate(`${dateLabel} ${year}`);
}

function toSortableDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
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
      description: transaction.description,
      category: transaction.category,
      flowType: transaction.flowType,
      amount: transaction.amount,
      balanceAfter: transaction.balanceAfter,
    })),
  };
}

async function archiveUploadedFiles(items) {
  if (!items.length) {
    return "No statements were archived.";
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

  const parsedMessage = `Parsed ${state.statements.length} statement${state.statements.length === 1 ? "" : "s"} and saved parsed data in your browser.`;
  if (!archiveAvailable && savedCount === 0) {
    return `${parsedMessage} File archiving is unavailable until you run \`python3 server.py\`.`;
  }

  const monthSummary = Array.from(summaryByMonth.entries())
    .map(([monthKey, count]) => `${count} file${count === 1 ? "" : "s"} in ${monthKey}`)
    .join(", ");

  if (!archiveAvailable) {
    return `${parsedMessage} Archived ${savedCount} original PDF${savedCount === 1 ? "" : "s"} locally (${monthSummary}), but some files could not be archived.`;
  }

  return `${parsedMessage} Archived ${savedCount} original PDF${savedCount === 1 ? "" : "s"} locally${monthSummary ? ` (${monthSummary})` : ""}.`;
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
  const validIds = new Set(state.transactions.map((transaction) => transaction.id));
  state.selectedTransactionIds = state.selectedTransactionIds.filter((id) => validIds.has(id));
}

function syncActiveStatementTab() {
  const validKeys = new Set(["all", ...state.statements.map((statement) => buildStatementKey(statement))]);
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
  return [...state.statements];
}

function getVisibleTransactions() {
  return state.transactions.filter((transaction) => {
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
  return state.statements.find(
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
