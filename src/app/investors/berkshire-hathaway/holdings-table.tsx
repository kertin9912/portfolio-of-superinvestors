"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { PortfolioComparison, PositionChange } from "@/lib/sec";
import styles from "./page.module.css";

type SoldPosition = PortfolioComparison["sold"][number];
type Activity = PositionChange["activity"] | SoldPosition["activity"];
type Row = PositionChange | SoldPosition;

const filters: Array<{ label: string; value: "ALL" | Activity }> = [
  { label: "ALL", value: "ALL" },
  { label: "NEW", value: "NEW" },
  { label: "ADDED", value: "ADDED" },
  { label: "REDUCED", value: "REDUCED" },
  { label: "SOLD", value: "SOLD" },
  { label: "UNCHANGED", value: "UNCHANGED" },
];

function number(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function money(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function change(value: number | null): string {
  if (value === null) return "NEW";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function HoldingsTable({ positions, sold }: { positions: PositionChange[]; sold: SoldPosition[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | Activity>("ALL");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const rows = useMemo(() => {
    const allRows: Row[] = [...positions, ...sold];
    return allRows.filter((position) => {
      const haystack = `${position.issuer} ${position.cusip} ${position.titleOfClass}`.toLowerCase();
      return haystack.includes(deferredQuery) && (filter === "ALL" || position.activity === filter);
    });
  }, [deferredQuery, filter, positions, sold]);

  return (
    <section className={styles.holdingsSection}>
      <div className={styles.tableHeader}>
        <div><span>TABLE 02 / COMPLETE INFORMATION TABLE</span><h2>Reported Holdings</h2></div>
        <label className={styles.search}>
          <span className="sr-only">Search issuer, CUSIP, or class</span>
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SEARCH ISSUER / CUSIP / CLASS" />
        </label>
      </div>
      <div className={styles.filters}>
        {filters.map((item) => (
          <button className={filter === item.value ? styles.activeFilter : ""} onClick={() => setFilter(item.value)} key={item.value} type="button">{item.label}</button>
        ))}
        <span>{rows.length} ROWS</span>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>#</th><th>ISSUER</th><th>CLASS</th><th>CUSIP</th><th>WEIGHT</th><th>SHARES / PRN</th><th>DISCLOSED VALUE</th><th>ACTIVITY</th><th>Q/Q SHARES</th></tr></thead>
          <tbody>
            {rows.map((position, index) => (
              <tr key={`${position.cusip}:${position.titleOfClass}:${position.activity}`}>
                <td>{String(index + 1).padStart(2, "0")}</td>
                <td><b>{position.issuer}</b></td>
                <td>{position.titleOfClass}</td>
                <td>{position.cusip}</td>
                <td><div className={styles.weight}><i style={{ width: `${Math.min(position.weight * 3.5, 100)}%` }} /><span>{position.weight.toFixed(2)}%</span></div></td>
                <td>{number(position.shares)}</td>
                <td><b>{money(position.value)}</b></td>
                <td><span className={`${styles.activity} ${styles[position.activity.toLowerCase() as "new" | "added" | "reduced" | "sold" | "unchanged"]}`}>{position.activity}</span></td>
                <td className={(position.shareChange ?? 0) > 0 ? styles.up : (position.shareChange ?? 0) < 0 ? styles.down : ""}>{change(position.shareChange)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className={styles.empty}>NO MATCHING POSITIONS</p> : null}
      </div>
    </section>
  );
}
