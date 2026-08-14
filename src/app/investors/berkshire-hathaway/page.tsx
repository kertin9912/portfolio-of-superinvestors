import Link from "next/link";
import { HoldingsTable } from "./holdings-table";
import styles from "./page.module.css";
import { formatMoney, formatPercent, getPortfolioComparison } from "@/lib/sec";

export const revalidate = 60;

function formatAccepted(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  }).format(new Date(value)).toUpperCase();
}

function TerminalHeader() {
  return (
    <>
      <div className={styles.blackBar}>
        <Link href="/" className={styles.brand}>PoS</Link>
        <span>INSTITUTIONAL HOLDINGS INTELLIGENCE</span>
        <div className={styles.live}><i /> SEC EDGAR LIVE</div>
      </div>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link href="/">DASHBOARD</Link>
        <Link href="/investors/berkshire-hathaway" className={styles.active}>BERKSHIRE</Link>
        <a href="#holdings">HOLDINGS</a>
        <a href="#activity">ACTIVITY</a>
        <a href="#source">SOURCE</a>
      </nav>
    </>
  );
}

export default async function BerkshirePage() {
  const comparison = await getPortfolioComparison("0001067983");
  const { current, previous, positions, sold } = comparison;
  const topTenConcentration = positions.slice(0, 10).reduce((sum, position) => sum + position.weight, 0);
  const counts = {
    new: positions.filter((position) => position.activity === "NEW").length,
    added: positions.filter((position) => position.activity === "ADDED").length,
    reduced: positions.filter((position) => position.activity === "REDUCED").length,
    unchanged: positions.filter((position) => position.activity === "UNCHANGED").length,
    sold: sold.length,
  };

  return (
    <main>
      <TerminalHeader />
      <div className={styles.contextBar}>
        <span>MANAGER <b>BERKSHIRE HATHAWAY INC</b></span>
        <span>CIK <b>{current.cik}</b></span>
        <span>FORM <b>{current.filing.form}</b></span>
        <span>PERIOD <b>{current.filing.reportDate}</b></span>
        <span className={styles.contextStatus}><i /> VERIFIED SOURCE</span>
      </div>

      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div>
            <p><Link href="/">13F MONITOR</Link> / MANAGER PROFILE</p>
            <h1>Berkshire Hathaway</h1>
            <span>WARREN E. BUFFETT · OMAHA, NEBRASKA</span>
          </div>
          <div className={styles.filingStamp}>
            <span>LATEST SEC ACCEPTANCE</span>
            <b>{formatAccepted(current.filing.acceptanceDateTime)} ET</b>
            <small>ACCESSION {current.filing.accessionNumber}</small>
          </div>
        </header>

        <section className={styles.kpis} aria-label="Berkshire portfolio summary">
          <article><span>DISCLOSED VALUE</span><b>{formatMoney(current.totalValue)}</b><small className={(comparison.valueChange ?? 0) >= 0 ? styles.up : styles.down}>{formatPercent(comparison.valueChange)} VS PRIOR REPORT</small></article>
          <article><span>REPORTABLE POSITIONS</span><b>{positions.length}</b><small>{counts.new} NEW · {counts.sold} SOLD</small></article>
          <article><span>TOP 10 CONCENTRATION</span><b>{topTenConcentration.toFixed(1)}%</b><small>OF REPORTED 13F VALUE</small></article>
          <article><span>REPORTING PERIOD</span><b>{current.filing.reportDate}</b><small>FILED {current.filing.filingDate}</small></article>
        </section>

        <div className={styles.analysisGrid} id="activity">
          <section className={styles.panel}>
            <div className={styles.panelHeader}><div><span>CHART 01</span><h2>Top Holdings by Disclosed Value</h2></div><span>% OF PORTFOLIO</span></div>
            <ol className={styles.topHoldings}>
              {positions.slice(0, 8).map((position, index) => (
                <li key={`${position.cusip}:${position.titleOfClass}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div><b>{position.issuer}</b></div>
                  <div className={styles.bar}><i style={{ width: `${Math.min((position.weight / positions[0].weight) * 100, 100)}%` }} /></div>
                  <strong>{position.weight.toFixed(2)}%</strong>
                  <em>{formatMoney(position.value)}</em>
                </li>
              ))}
            </ol>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHeader}><div><span>TABLE 01</span><h2>Quarterly Activity</h2></div><span>SHARE COUNT BASIS</span></div>
            <div className={styles.activityGrid}>
              <article><span>NEW POSITIONS</span><b>{counts.new}</b></article>
              <article><span>ADDED</span><b className={styles.up}>{counts.added}</b></article>
              <article><span>REDUCED</span><b className={styles.down}>{counts.reduced}</b></article>
              <article><span>SOLD OUT</span><b className={styles.down}>{counts.sold}</b></article>
            </div>
            <dl className={styles.comparison}>
              <div><dt>CURRENT PERIOD</dt><dd>{current.filing.reportDate}</dd></div>
              <div><dt>PRIOR PERIOD</dt><dd>{previous?.filing.reportDate ?? "—"}</dd></div>
              <div><dt>UNCHANGED</dt><dd>{counts.unchanged} POSITIONS</dd></div>
              <div><dt>VALUE CHANGE</dt><dd className={(comparison.valueChange ?? 0) >= 0 ? styles.up : styles.down}>{formatPercent(comparison.valueChange)}</dd></div>
            </dl>
          </aside>
        </div>

        <div id="holdings">
          <HoldingsTable positions={positions} sold={sold} />
        </div>

        <section className={styles.sourcePanel} id="source">
          <div><span>DATA CONTROL / SOURCE VERIFIED</span><h2>Official SEC filing record</h2><p>Positions are parsed from the filing&apos;s public XML information table and normalized by security identity. Activity compares reported share counts with the immediately preceding reporting period. No mock positions, inferred tickers, or estimated market prices are used.</p></div>
          <dl>
            <div><dt>SEC ACCEPTED</dt><dd>{current.filing.acceptanceDateTime}</dd></div>
            <div><dt>REPORT DATE</dt><dd>{current.filing.reportDate}</dd></div>
            <div><dt>ACCESSION</dt><dd>{current.filing.accessionNumber}</dd></div>
            <div><dt>PIPELINE CACHE</dt><dd>60 SECONDS</dd></div>
          </dl>
          <a href={current.filingUrl} target="_blank" rel="noreferrer">OPEN ORIGINAL SEC FILING ↗</a>
        </section>
      </div>
    </main>
  );
}
