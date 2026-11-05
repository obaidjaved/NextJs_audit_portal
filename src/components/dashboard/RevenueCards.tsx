"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DetailsDialog } from "@/components/ops/Dialog";
import { fmtDate } from "@/components/ops/Parts";
import {
  balancesIn,
  money,
  paymentsIn,
  PERIOD_LABEL,
  sumBalance,
  sumOf,
  type BalanceLine,
  type PaymentLine,
  type Period,
} from "@/lib/revenue";

const REVENUE_PERIODS: Period[] = ["1y", "6m", "3m", "month"];
const COLLECT_PERIODS: Period[] = ["all", "1y", "6m", "3m", "month"];

type Open = "total" | "revenue" | "collect" | null;

// Three money cards for the admin Console. Each opens a pop-up with the figures behind it.
export function RevenueCards({ payments, balances, todayKey }: { payments: PaymentLine[]; balances: BalanceLine[]; todayKey: string }) {
  const [revenuePeriod, setRevenuePeriod] = useState<Period>("month");
  const [collectPeriod, setCollectPeriod] = useState<Period>("month");
  const [open, setOpen] = useState<Open>(null);

  const total = useMemo(() => sumOf(payments), [payments]);
  const revenueLines = useMemo(() => paymentsIn(payments, revenuePeriod, todayKey), [payments, revenuePeriod, todayKey]);
  const collectLines = useMemo(() => balancesIn(balances, collectPeriod, todayKey), [balances, collectPeriod, todayKey]);

  const card = (
    key: Exclude<Open, null>,
    tone: "total" | "revenue" | "collect",
    label: string,
    value: number,
    detail: string,
    picker?: { value: Period; options: Period[]; onChange: (p: Period) => void },
  ) => (
    <div className="console-card card revenue-card" data-tone={tone}>
      <div className="revenue-card-top">
        <span className="console-card-label">{label}</span>
        {picker && (
          <select
            className="select dt-select revenue-select"
            aria-label={`${label}: period`}
            value={picker.value}
            onChange={(e) => picker.onChange(e.target.value as Period)}
          >
            {picker.options.map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABEL[p]}
              </option>
            ))}
          </select>
        )}
      </div>
      <span className="console-card-value">{money(value)}</span>
      <span className="revenue-card-sub">{detail}</span>
      <button type="button" className="revenue-card-more" onClick={() => setOpen(key)}>
        View details ▸
      </button>
    </div>
  );

  const customersIn = (lines: { customerId: string }[]) => new Set(lines.map((l) => l.customerId)).size;

  return (
    <>
      <div className="revenue-cards">
        {card("total", "total", "Total revenue", total, `All time · ${payments.length} payment${payments.length === 1 ? "" : "s"}`)}
        {card("revenue", "revenue", "Revenue", sumOf(revenueLines), `${PERIOD_LABEL[revenuePeriod]} · ${revenueLines.length} payment${revenueLines.length === 1 ? "" : "s"}`, {
          value: revenuePeriod,
          options: REVENUE_PERIODS,
          onChange: setRevenuePeriod,
        })}
        {card("collect", "collect", "To be collected", sumBalance(collectLines), `${PERIOD_LABEL[collectPeriod]} · ${collectLines.length} customer${collectLines.length === 1 ? "" : "s"} owe`, {
          value: collectPeriod,
          options: COLLECT_PERIODS,
          onChange: setCollectPeriod,
        })}
      </div>

      {open === "total" && (
        <DetailsDialog title="Total revenue" subtitle="Every payment recorded, all time" onClose={() => setOpen(null)}>
          <PaymentTable lines={payments} customerCount={customersIn(payments)} />
        </DetailsDialog>
      )}
      {open === "revenue" && (
        <DetailsDialog title={`Revenue: ${PERIOD_LABEL[revenuePeriod].toLowerCase()}`} subtitle="Payments received in this period" onClose={() => setOpen(null)}>
          <PaymentTable lines={revenueLines} customerCount={customersIn(revenueLines)} />
        </DetailsDialog>
      )}
      {open === "collect" && (
        <DetailsDialog title={`To be collected: ${PERIOD_LABEL[collectPeriod].toLowerCase()}`} subtitle="What customers still owe on their deals" onClose={() => setOpen(null)}>
          <BalanceTable lines={collectLines} period={collectPeriod} />
        </DetailsDialog>
      )}
    </>
  );
}

const cell = { padding: "8px 6px", borderBottom: "1px solid var(--rule)", fontSize: 13, verticalAlign: "top" } as const;
const head = { ...cell, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-2)" } as const;
const right = { textAlign: "right", whiteSpace: "nowrap" } as const;

function PaymentTable({ lines, customerCount }: { lines: PaymentLine[]; customerCount: number }) {
  const byMethod = new Map<string, number>();
  for (const l of lines) byMethod.set(l.method ?? "Not recorded", (byMethod.get(l.method ?? "Not recorded") ?? 0) + l.amount);

  if (lines.length === 0) return <p style={{ color: "var(--ink-2)", fontSize: 13.5 }}>No payments were received in this period.</p>;
  return (
    <div>
      <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>
        <strong>{money(sumOf(lines))}</strong> from {lines.length} payment{lines.length === 1 ? "" : "s"} by {customerCount} customer{customerCount === 1 ? "" : "s"}.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {[...byMethod.entries()].map(([method, amount]) => (
          <span key={method} className="pill accent" style={{ textTransform: "none", letterSpacing: 0 }}>
            {method}: {money(Math.round(amount * 100) / 100)}
          </span>
        ))}
      </div>
      <div style={{ maxHeight: "50vh", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>Date</th>
              <th style={{ ...head, textAlign: "left" }}>Customer</th>
              <th style={{ ...head, textAlign: "left" }}>Paid via</th>
              <th style={{ ...head, ...right }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td style={{ ...cell, whiteSpace: "nowrap" }}>{fmtDate(l.date)}</td>
                <td style={cell}>
                  <Link href={`/customers?customerId=${l.customerId}`}>{l.customer}</Link>
                  {l.transactionId && <div className="mono" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>{l.transactionId}</div>}
                </td>
                <td style={cell}>{l.method ?? "—"}</td>
                <td style={{ ...cell, ...right, fontWeight: 600 }}>{money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BalanceTable({ lines, period }: { lines: BalanceLine[]; period: Period }) {
  if (lines.length === 0) return <p style={{ color: "var(--ink-2)", fontSize: 13.5 }}>Nobody owes anything for this period.</p>;
  return (
    <div>
      <p style={{ margin: "0 0 4px", fontSize: 13.5 }}>
        <strong>{money(sumBalance(lines))}</strong> still to collect from {lines.length} customer{lines.length === 1 ? "" : "s"}.
      </p>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--ink-2)" }}>
        {period === "all" ? "All customers with a deal total on file." : "Customers added in this period."} Balance = deal total minus payments recorded.
      </p>
      <div style={{ maxHeight: "50vh", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...head, textAlign: "left" }}>Customer</th>
              <th style={{ ...head, ...right }}>Deal total</th>
              <th style={{ ...head, ...right }}>Paid</th>
              <th style={{ ...head, ...right }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.customerId}>
                <td style={cell}>
                  <Link href={`/customers?customerId=${l.customerId}`}>{l.customer}</Link>
                  <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>Added {fmtDate(l.started)}</div>
                </td>
                <td style={{ ...cell, ...right }}>{money(l.total)}</td>
                <td style={{ ...cell, ...right }}>{money(l.paid)}</td>
                <td style={{ ...cell, ...right, fontWeight: 700, color: "var(--danger)" }}>{money(l.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
