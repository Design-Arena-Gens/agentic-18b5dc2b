"use client";

import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid/non-secure";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
] as const;

type MonthKey = (typeof MONTHS)[number];

type CategoryType = "income" | "expense" | "savings";

type SheetRow = {
  id: string;
  label: string;
  type: CategoryType;
  values: Record<MonthKey, number>;
};

type PersistedState = {
  rows: SheetRow[];
  currency: string;
};

const STORAGE_KEY = "finance-sheet-state-v1";

const formatter = (currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

const defaultRows: SheetRow[] = [
  {
    id: "salary",
    label: "Primary Income",
    type: "income",
    values: createBlankValues(5500, 0)
  },
  {
    id: "side-income",
    label: "Side Income",
    type: "income",
    values: createBlankValues(650, 0)
  },
  {
    id: "rent",
    label: "Housing & Rent",
    type: "expense",
    values: createBlankValues(1850, 20)
  },
  {
    id: "groceries",
    label: "Groceries",
    type: "expense",
    values: createBlankValues(580, 60)
  },
  {
    id: "transport",
    label: "Transportation",
    type: "expense",
    values: createBlankValues(220, 30)
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    type: "expense",
    values: createBlankValues(95, 5)
  },
  {
    id: "emergency-fund",
    label: "Emergency Fund",
    type: "savings",
    values: createBlankValues(400, 50)
  },
  {
    id: "retirement",
    label: "Retirement",
    type: "savings",
    values: createBlankValues(650, 20)
  }
];

function cloneRows(rows: SheetRow[]): SheetRow[] {
  return rows.map((row) => ({
    ...row,
    values: { ...row.values }
  }));
}

function createBlankValues(base: number, variation: number) {
  return MONTHS.reduce<Record<MonthKey, number>>((acc, month, index) => {
    const drift = ((index % 2 === 0 ? -1 : 1) * variation) / 2;
    acc[month] = Math.max(0, Math.round(base + drift));
    return acc;
  }, {} as Record<MonthKey, number>);
}

const currencyOptions = [
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "GBP", value: "GBP" },
  { label: "CAD", value: "CAD" }
];

export default function FinanceSheet() {
  const [rows, setRows] = useState<SheetRow[]>(() => cloneRows(defaultRows));
  const [currency, setCurrency] = useState<string>("USD");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.rows && parsed.currency) {
        setRows(cloneRows(parsed.rows));
        setCurrency(parsed.currency);
      }
    } catch (error) {
      console.warn("Unable to restore saved finance sheet state", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = { rows, currency };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [rows, currency]);

  const currencyFormatter = useMemo(() => formatter(currency), [currency]);

  const monthlyTotals = useMemo(() => {
    return MONTHS.reduce(
      (acc, month) => {
        const income = totalFor(month, rows, "income");
        const expense = totalFor(month, rows, "expense");
        const savings = totalFor(month, rows, "savings");
        acc.income[month] = income;
        acc.expense[month] = expense;
        acc.savings[month] = savings;
        acc.net[month] = income - expense - savings;
        return acc;
      },
      {
        income: createZeroValues(),
        expense: createZeroValues(),
        savings: createZeroValues(),
        net: createZeroValues()
      }
    );
  }, [rows]);

  const annualTotals = useMemo(() => {
    const income = sumRecord(monthlyTotals.income);
    const expense = sumRecord(monthlyTotals.expense);
    const savings = sumRecord(monthlyTotals.savings);
    const net = sumRecord(monthlyTotals.net);
    return { income, expense, savings, net };
  }, [monthlyTotals]);

  const savingsRate = annualTotals.income
    ? (annualTotals.savings / annualTotals.income) * 100
    : 0;

  const highestExpense = useMemo(() => {
    return rows
      .filter((row) => row.type === "expense")
      .map((row) => ({
        label: row.label,
        total: sumRecord(row.values)
      }))
      .sort((a, b) => b.total - a.total)[0];
  }, [rows]);

  const handleChange = (rowId: string, month: MonthKey, value: string) => {
    const parsed = Number.parseFloat(value);
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              values: {
                ...row.values,
                [month]: Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
              }
            }
          : row
      )
    );
  };

  const addRow = (type: CategoryType) => {
    const label = window.prompt(`Name for the new ${type} category?`);
    if (!label) return;
    setRows((prev) => [
      ...prev,
      {
        id: nanoid(8),
        label: label.trim(),
        type,
        values: createZeroValues()
      }
    ]);
  };

  const removeRow = (rowId: string) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const reset = () => {
    if (!window.confirm("Reset sheet to template values?")) return;
    setRows(cloneRows(defaultRows));
    setCurrency("USD");
    window.localStorage.removeItem(STORAGE_KEY);
  };

  const downloadCsv = () => {
    const header = ["Category", ...MONTHS, "Annual Total"].join(",");
    const lines = rows.map((row) => {
      const monthly = MONTHS.map((month) => row.values[month].toString());
      const total = sumRecord(row.values).toString();
      return [row.label, ...monthly, total].join(",");
    });
    const blob = new Blob([`${header}\n${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.setAttribute("download", "personal-finance-sheet.csv");
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <main>
      <section className="finance-shell">
        <header className="sheet-header">
          <span className="badge">Personal Finance Control Center</span>
          <h1 className="sheet-title">Personal Finance Spreadsheet</h1>
          <p className="sheet-subtitle">
            Track income, expenses, and savings across the year. Values persist
            locally and you can export a CSV whenever you need a traditional
            spreadsheet.
          </p>
          <div className="toolbar">
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="primary" onClick={() => addRow("income")}>
              + Add Income Row
            </button>
            <button className="primary" onClick={() => addRow("expense")}>
              + Add Expense Row
            </button>
            <button className="secondary" onClick={() => addRow("savings")}>
              + Add Savings Row
            </button>
            <button className="secondary" onClick={downloadCsv}>
              Export CSV
            </button>
            <button className="secondary" onClick={reset}>
              Reset Template
            </button>
          </div>
          <span className="note">
            Tip: Click any cell to edit. Your changes autosave in this browser.
          </span>
        </header>

        <div className="sheet-grid">
          <table className="finance-table">
            <thead>
              <tr>
                <th>Category</th>
                {MONTHS.map((month) => (
                  <th key={month}>{month}</th>
                ))}
                <th>Annual</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th>
                    <div>
                      {row.label}
                      <div className="muted">{row.type.toUpperCase()}</div>
                    </div>
                  </th>
                  {MONTHS.map((month) => (
                    <td key={`${row.id}-${month}`}>
                      <input
                        className="amount-input"
                        type="number"
                        min={0}
                        step={10}
                        value={row.values[month] === 0 ? "" : row.values[month]}
                        onChange={(event) =>
                          handleChange(row.id, month, event.target.value)
                        }
                        placeholder="0"
                        inputMode="decimal"
                      />
                    </td>
                  ))}
                  <td className="cell-metric">
                    {currencyFormatter.format(sumRecord(row.values))}
                  </td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => removeRow(row.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              <tr>
                <th>Total Income</th>
                {MONTHS.map((month) => (
                  <td className="cell-metric" key={`income-${month}`}>
                    {currencyFormatter.format(monthlyTotals.income[month])}
                  </td>
                ))}
                <td className="cell-metric">
                  {currencyFormatter.format(annualTotals.income)}
                </td>
                <td></td>
              </tr>
              <tr>
                <th>Total Expenses</th>
                {MONTHS.map((month) => (
                  <td className="cell-metric" key={`expense-${month}`}>
                    {currencyFormatter.format(monthlyTotals.expense[month])}
                  </td>
                ))}
                <td className="cell-metric">
                  {currencyFormatter.format(annualTotals.expense)}
                </td>
                <td></td>
              </tr>
              <tr>
                <th>Total Savings</th>
                {MONTHS.map((month) => (
                  <td className="cell-metric" key={`savings-${month}`}>
                    {currencyFormatter.format(monthlyTotals.savings[month])}
                  </td>
                ))}
                <td className="cell-metric">
                  {currencyFormatter.format(annualTotals.savings)}
                </td>
                <td></td>
              </tr>
              <tr>
                <th>Net Position</th>
                {MONTHS.map((month) => (
                  <td className="cell-metric" key={`net-${month}`}>
                    {currencyFormatter.format(monthlyTotals.net[month])}
                  </td>
                ))}
                <td className="cell-metric">
                  {currencyFormatter.format(annualTotals.net)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside className="summary-card">
          <h3>At-a-glance Summary</h3>
          <div className="summary-row income">
            <span>Projected Income</span>
            <strong>{currencyFormatter.format(annualTotals.income)}</strong>
          </div>
          <div className="summary-row expense">
            <span>Projected Expenses</span>
            <strong>{currencyFormatter.format(annualTotals.expense)}</strong>
          </div>
          <div className="summary-row">
            <span>Annual Savings</span>
            <strong>{currencyFormatter.format(annualTotals.savings)}</strong>
          </div>
          <div className="summary-row net">
            <span>Net Cashflow</span>
            <strong>{currencyFormatter.format(annualTotals.net)}</strong>
          </div>
          <div className="insights">
            <div className="insight-item">
              <strong>Savings Rate</strong>
              <span>{savingsRate.toFixed(1)}%</span>
              <p className="muted">
                Aim for 20%+ to stay on track with long-term goals.
              </p>
            </div>
            {highestExpense ? (
              <div className="insight-item">
                <strong>Largest Expense</strong>
                <span>
                  {highestExpense.label}: {" "}
                  {currencyFormatter.format(highestExpense.total)}
                </span>
                <p className="muted">
                  Revisit this category for optimization opportunities.
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function createZeroValues(): Record<MonthKey, number> {
  return MONTHS.reduce<Record<MonthKey, number>>((acc, month) => {
    acc[month] = 0;
    return acc;
  }, {} as Record<MonthKey, number>);
}

function sumRecord(values: Record<MonthKey, number>): number {
  return Object.values(values).reduce((total, current) => total + current, 0);
}

function totalFor(month: MonthKey, rows: SheetRow[], type: CategoryType) {
  return rows
    .filter((row) => row.type === type)
    .reduce((acc, row) => acc + (row.values[month] ?? 0), 0);
}
