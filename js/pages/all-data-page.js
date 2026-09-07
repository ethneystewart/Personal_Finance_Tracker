// Lifetime dashboard: an optional year filter and a month-by-month spending overview.
function getTransactionsInView(state, { excludeInternalTransfers, getTransactionMonthKey }) {
  return excludeInternalTransfers(state.transactions).filter((transaction) => {
    return !state.allDataYear || getTransactionMonthKey(transaction).startsWith(state.allDataYear);
  });
}

export function renderAllDataYearFilter({ state, els, helpers }) {
  const years = helpers.getAvailableYears();
  if (state.allDataYear && !years.includes(state.allDataYear)) {
    state.allDataYear = "";
  }
  els.allDataYearSelector.innerHTML = `<option value="">All years</option>${years
    .map((year) => `<option value="${year}">${helpers.escapeHtml(year)}</option>`)
    .join("")}`;
  els.allDataYearSelector.value = state.allDataYear;
}

export function handleAllDataYearChange(event, { state, helpers }) {
  state.allDataYear = event.target.value;
  helpers.render();
}

export function renderAllDataSummary({ state, els, helpers }) {
  const { sumAmounts, formatMoney, getTransactionMonthKey, formatMonthLabel, escapeHtml } = helpers;
  const transactions = getTransactionsInView(state, helpers);
  const income = sumAmounts(
    transactions.filter((transaction) => transaction.flowType === "credit").map((transaction) => Math.abs(transaction.amount))
  );
  const spending = sumAmounts(
    transactions.filter((transaction) => transaction.flowType === "charge").map((transaction) => Math.abs(transaction.amount))
  );
  const net = income - spending;
  const statementCount = new Set(transactions.map((transaction) => transaction.fileName || transaction.statementId).filter(Boolean)).size;

  els.allDataStatementCount.textContent = String(statementCount);
  els.allDataIncomeTotal.textContent = formatMoney(income);
  els.allDataSpendingTotal.textContent = formatMoney(spending);
  els.allDataNetTotal.textContent = formatMoney(net);
  els.allDataNetTotal.className = net < 0 ? "amount-negative" : "amount-positive";

  const summaries = transactions.reduce((months, transaction) => {
    const key = getTransactionMonthKey(transaction) || "unknown";
    months[key] ||= { key, income: 0, spending: 0, statementKeys: new Set() };
    const summary = months[key];
    if (transaction.flowType === "credit") summary.income += Math.abs(transaction.amount);
    if (transaction.flowType === "charge") summary.spending += Math.abs(transaction.amount);
    summary.statementKeys.add(transaction.statementId || transaction.fileName || transaction.id);
    return months;
  }, {});

  const months = Object.values(summaries)
    .filter((summary) => summary.income || summary.spending)
    .sort((a, b) => b.key.localeCompare(a.key));

  if (!months.length) {
    els.allDataMonthHistory.className = "month-history empty-state";
    els.allDataMonthHistory.textContent = "No transactions match this year.";
    return;
  }

  els.allDataMonthHistory.className = "month-history";
  els.allDataMonthHistory.innerHTML = months
    .map((summary) => {
      const netChange = summary.income - summary.spending;
      return `
        <article class="month-history-row">
          <div>
            <h3>${escapeHtml(summary.key === "unknown" ? "Unknown month" : formatMonthLabel(summary.key))}</h3>
            <p>${summary.statementKeys.size} statement${summary.statementKeys.size === 1 ? "" : "s"}</p>
          </div>
          <div class="month-history-amount">
            <span>In <strong class="amount-positive">${formatMoney(summary.income)}</strong></span>
            <span>Out <strong class="amount-negative">${formatMoney(summary.spending)}</strong></span>
            <span>Net <strong class="${netChange < 0 ? "amount-negative" : "amount-positive"}">${formatMoney(netChange)}</strong></span>
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderMonthlyCategorySpendChart({ state, els, helpers }) {
  const { getTransactionMonthKey, getCategoryColor, formatMonthLabel, formatMoney, escapeHtml, setEmpty } = helpers;
  const charges = getTransactionsInView(state, helpers).filter((transaction) => transaction.flowType === "charge");
  if (!charges.length) {
    setEmpty(els.allDataSpendingChart, "No spending transactions match this year.");
    return;
  }

  const months = charges.reduce((totals, transaction) => {
    const key = getTransactionMonthKey(transaction);
    if (!key) return totals;
    totals[key] ||= { key, total: 0, categories: {} };
    const value = Math.abs(Number(transaction.amount) || 0);
    totals[key].total += value;
    totals[key].categories[transaction.category] = (totals[key].categories[transaction.category] || 0) + value;
    return totals;
  }, {});
  const entries = Object.values(months).sort((a, b) => a.key.localeCompare(b.key));
  if (!entries.length) {
    setEmpty(els.allDataSpendingChart, "Spending needs transaction dates before it can be charted.");
    return;
  }

  const categories = Array.from(
    new Set(entries.flatMap((entry) => Object.keys(entry.categories)))
  ).sort((a, b) => {
    const totalFor = (category) => entries.reduce((total, entry) => total + (entry.categories[category] || 0), 0);
    return totalFor(b) - totalFor(a);
  });
  const max = Math.max(...entries.map((entry) => entry.total), 1);

  els.allDataSpendingChart.className = "chart-area";
  els.allDataSpendingChart.innerHTML = `
    <div class="stacked-spending-chart">
      <div class="stacked-spending-bars" role="img" aria-label="Monthly spending grouped by category">
        ${entries
          .map((entry) => {
            const heightPx = Math.max((entry.total / max) * 240, 28);
            return `
              ${(() => {
                const activeCategories = categories.filter((category) => entry.categories[category]);
                const barTooltip = activeCategories
                  .slice()
                  .sort((a, b) => entry.categories[b] - entry.categories[a])
                  .map((category) => `${category}: ${formatMoney(entry.categories[category])}`)
                  .join("\n");
                const segments = activeCategories
                  .map((category, index) => {
                    const height = (entry.categories[category] / entry.total) * 100;
                    const edgeClass = [
                      index === 0 ? "spending-segment-bottom" : "",
                      index === activeCategories.length - 1 ? "spending-segment-top" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return `<span class="spending-segment ${edgeClass}" style="height:${height}%; background:${getCategoryColor(category).solid};"></span>`;
                  })
                  .join("");
                return `
                  <div class="stacked-spending-bar-item">
                    <div class="stacked-spending-value">${formatMoney(entry.total)}</div>
                    <div class="stacked-spending-bar" style="height:${heightPx}px;" data-tooltip="${escapeHtml(barTooltip)}">
                      ${segments}
                    </div>
                    <div class="stacked-spending-label">${escapeHtml(formatMonthLabel(entry.key))}</div>
                  </div>
                `;
              })()}
            `;
          })
          .join("")}
      </div>
      <div class="stacked-spending-legend" aria-label="Spending categories">
        ${categories
          .map((category) => `<span><i style="background:${getCategoryColor(category).solid};"></i>${escapeHtml(category)}</span>`)
          .join("")}
      </div>
    </div>
  `;
}

let spendingChartTooltip = null;

function getSpendingChartTooltip() {
  if (!spendingChartTooltip || !spendingChartTooltip.isConnected) {
    spendingChartTooltip = document.createElement("div");
    spendingChartTooltip.className = "chart-floating-tooltip hidden";
    document.body.appendChild(spendingChartTooltip);
  }
  return spendingChartTooltip;
}

// Positioned with `position: fixed` and appended to <body> so the tooltip escapes the
// chart's horizontally-scrolling container instead of being clipped by it.
export function handleSpendingChartPointerOver(event) {
  const bar = event.target.closest(".stacked-spending-bar");
  if (!bar || !bar.dataset.tooltip) {
    return;
  }
  const tooltip = getSpendingChartTooltip();
  tooltip.textContent = bar.dataset.tooltip;
  const rect = bar.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top - 8}px`;
  tooltip.classList.remove("hidden");
}

export function handleSpendingChartPointerOut(event) {
  const bar = event.target.closest(".stacked-spending-bar");
  if (!bar || bar.contains(event.relatedTarget)) {
    return;
  }
  getSpendingChartTooltip().classList.add("hidden");
}
