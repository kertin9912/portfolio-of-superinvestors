"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./page.module.css";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export type ManagerDirectoryItem = {
  cik: string;
  slug: string;
  displayName: string;
  profileLine: string;
  category: string;
  searchText: string;
  initials: string;
  available: boolean;
  totalValue: string;
  positionCount: number | null;
  reportDate: string | null;
  filedAt: string | null;
  error: string | null;
};

export function ManagerDirectory({ items }: { items: ManagerDirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [initial, setInitial] = useState("ALL");
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const availableInitials = new Set(items.flatMap((item) => item.initials.split("")));
  const visibleItems = items.filter((item) => {
    const matchesQuery = normalizedQuery.length === 0
      || item.searchText.toLocaleLowerCase("en-US").includes(normalizedQuery);
    const matchesInitial = initial === "ALL" || item.initials.includes(initial);
    return matchesQuery && matchesInitial;
  });

  function resetFilters() {
    setQuery("");
    setInitial("ALL");
  }

  return (
    <section className={styles.directory} id="coverage" aria-labelledby="directory-heading">
      <div className={styles.directoryHeader}>
        <div>
          <span>DIRECTORY / {items.length} TRACKED MANAGERS</span>
          <h2 id="directory-heading">Manager Coverage</h2>
        </div>
        <p><b>{visibleItems.length}</b> RESULTS</p>
      </div>

      <div className={styles.directoryControls}>
        <label className={styles.searchField}>
          <span>SEARCH</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="MANAGER OR INVESTOR NAME"
            autoComplete="off"
          />
        </label>

        <div className={styles.alphabetFilter} aria-label="Filter managers by initial">
          <button
            type="button"
            className={initial === "ALL" ? styles.selectedInitial : undefined}
            aria-pressed={initial === "ALL"}
            onClick={() => setInitial("ALL")}
          >
            ALL
          </button>
          {ALPHABET.map((letter) => (
            <button
              type="button"
              key={letter}
              disabled={!availableInitials.has(letter)}
              className={initial === letter ? styles.selectedInitial : undefined}
              aria-pressed={initial === letter}
              onClick={() => setInitial(letter)}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length > 0 ? (
        <div className={styles.managerGrid} aria-live="polite">
          {visibleItems.map((item, index) => (
            <article className={styles.managerCard} key={item.cik}>
              <div className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</div>
              <div className={styles.cardStatus}>
                <i className={item.available ? styles.online : styles.offline} />
                {item.available ? "LIVE" : "UNAVAILABLE"}
              </div>
              <span className={styles.categoryBadge}>{item.category}</span>
              <p>CIK {item.cik}</p>
              <h3>{item.displayName}</h3>
              <span className={styles.profileLine}>{item.profileLine}</span>
              <strong>{item.totalValue}</strong>
              <dl>
                <div><dt>POSITIONS</dt><dd>{item.positionCount ?? "—"}</dd></div>
                <div><dt>REPORTING PERIOD</dt><dd>{item.reportDate ?? "—"}</dd></div>
                <div><dt>FILED</dt><dd>{item.filedAt ?? "—"}</dd></div>
              </dl>
              {item.available ? (
                <Link href={`/investors/${item.slug}`}>VIEW HOLDINGS <span>→</span></Link>
              ) : (
                <span className={styles.error}>{item.error}</span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyDirectory} aria-live="polite">
          <span>NO MATCHING MANAGERS</span>
          <p>Try another name or clear the selected initial.</p>
          <button type="button" onClick={resetFilters}>CLEAR FILTERS</button>
        </div>
      )}
    </section>
  );
}
