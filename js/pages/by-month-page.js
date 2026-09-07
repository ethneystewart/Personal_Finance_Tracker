// Selected-period dashboard: its totals and budget check always follow the month/year selector.
export function renderMonthSelector({ state, els, helpers }) {
  const { getAvailableYears, getAvailableMonths, escapeHtml, formatMonthLabel } = helpers;
  els.periodScopeToggle.querySelectorAll("[data-scope]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scope === state.viewScope);
  });

  if (state.viewScope === "year") {
    const years = Array.from(new Set([...getAvailableYears(), state.activeYear].filter(Boolean))).sort((a, b) => b.localeCompare(a));
    els.periodSelector.innerHTML = `<option value="">All years</option>${years
      .map((year) => `<option value="${year}">${escapeHtml(year)}</option>`)
      .join("")}`;
    els.periodSelector.value = state.activeYear;
    return;
  }

  const months = Array.from(new Set([...getAvailableMonths(), state.activeMonth].filter(Boolean))).sort((a, b) => b.localeCompare(a));
  els.periodSelector.innerHTML = `<option value="">All months</option>${months
    .map((monthKey) => `<option value="${monthKey}">${escapeHtml(formatMonthLabel(monthKey))}</option>`)
    .join("")}`;
  els.periodSelector.value = state.activeMonth;
}

export function renderOverview({ state, els, helpers }) {
  const { getMonthFilteredTransactions, excludeInternalTransfers, sumAmounts, formatMoney } = helpers;
  const allTransactions = getMonthFilteredTransactions();
  const transactions = excludeInternalTransfers(allTransactions);
  const inflow = sumAmounts(transactions.filter((transaction) => transaction.flowType === "credit").map((transaction) => Math.abs(transaction.amount)));
  const outflow = sumAmounts(transactions.filter((transaction) => transaction.flowType === "charge").map((transaction) => Math.abs(transaction.amount)));
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

export function renderIncomeGoalCard({ state, els, helpers }) {
  const { getEffectiveBudget, getMonthFilteredTransactions, excludeInternalTransfers, sumAmounts, formatMonthLabel, formatMoney, escapeHtml } = helpers;
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
        ? `<div class="budget-progress-track"><div class="budget-progress-fill ${isOver ? "over-budget" : ""}" style="width:${pct}%;"></div></div>
          <p class="${isOver ? "budget-allocation-warning" : "muted"}">${formatMoney(spend)} spent of ${formatMoney(incomeGoal)} expected
          ${isOver ? `· ${formatMoney(Math.abs(remaining))} over your expected income` : `· ${formatMoney(remaining)} left`}</p>`
        : `<p class="muted">Set your expected income for ${escapeHtml(formatMonthLabel(monthKey))} to track overspending.</p>`
    }
  `;
}

export function handleIncomeGoalInputChange(event, { state, helpers }) {
  const { getEffectiveBudget, persistBudgets, render } = helpers;
  const input = event.target.closest("#incomeGoalInput");
  if (!input) return;

  const value = Math.max(Number(input.value) || 0, 0);
  let budget = state.budgets.find((item) => item.startMonth === state.activeMonth);
  if (!budget) {
    const inherited = getEffectiveBudget(state.activeMonth);
    budget = { id: crypto.randomUUID(), startMonth: state.activeMonth, amounts: { ...(inherited?.amounts || {}) } };
    state.budgets.push(budget);
    state.budgets.sort((a, b) => a.startMonth.localeCompare(b.startMonth));
  }
  budget.amounts.Income = value;
  persistBudgets();
  render();
}
