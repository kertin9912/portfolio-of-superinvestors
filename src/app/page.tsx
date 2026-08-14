import Link from "next/link";
import styles from "./page.module.css";
import { formatMoney, getManagerDashboard, managers } from "@/lib/sec";

export const revalidate = 60;

function formatAccepted(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "America/New_York",
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
        <Link href="/" className={styles.active}>DASHBOARD</Link>
        <a href="#managers">MANAGERS</a><a href="#holdings">HOLDINGS</a><a href="#filings">FILINGS</a><a href="#methodology">METHODOLOGY</a>
        <span className={styles.shortcut}>SEARCH <kbd>/</kbd></span>
      </nav>
    </>
  );
}

export default async function Home() {
  const dashboard = await getManagerDashboard();
  const displayNames = new Map<string, string>(managers.map((manager) => [manager.cik, manager.displayName]));
  const available = dashboard.flatMap((item) => item.portfolio ? [item.portfolio] : []);
  const sortedFilings = [...available].sort((left, right) => right.filing.acceptanceDateTime.localeCompare(left.filing.acceptanceDateTime));
  const totalValue = available.reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
  const totalPositions = available.reduce((sum, portfolio) => sum + portfolio.positions.length, 0);
  const berkshire = available.find((portfolio) => portfolio.cik === "0001067983");
  const generatedAt = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "UTC",
  }).format(new Date()).toUpperCase();

  return (
    <main>
      <TerminalHeader />
      <div className={styles.tape}>
        {available.map((portfolio) => (
          <span key={portfolio.cik}><b>{displayNames.get(portfolio.cik) ?? portfolio.managerName}</b> {formatMoney(portfolio.totalValue)} <i>{portfolio.positions.length} POS</i></span>
        ))}
      </div>

      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div><p>13F MONITOR / UNITED STATES</p><h1>Institutional Holdings</h1></div>
          <div className={styles.timestamp}><span>LAST REFRESH</span><b>{generatedAt} UTC</b><small>AUTO REFRESH · 60 SEC</small></div>
        </header>

        <section className={styles.kpis} aria-label="Portfolio summary">
          <article><span>TRACKED DISCLOSED VALUE</span><b>{formatMoney(totalValue)}</b><small>{available.length} REPORTING MANAGERS</small></article>
          <article><span>UNIQUE MANAGER POSITIONS</span><b>{totalPositions.toLocaleString("en-US")}</b><small>LATEST AVAILABLE 13F</small></article>
          <article><span>LATEST REPORTING PERIOD</span><b>{sortedFilings[0]?.filing.reportDate ?? "—"}</b><small>OFFICIAL SEC REPORT DATE</small></article>
          <article><span>DATA AVAILABILITY</span><b className={available.length === dashboard.length ? styles.up : styles.down}>{available.length}/{dashboard.length}</b><small>LIVE SOURCES ONLINE</small></article>
        </section>

        <div className={styles.dashboardGrid}>
          <section className={styles.panel} id="managers">
            <div className={styles.panelHeader}><div><span>TABLE 01</span><h2>Reporting Managers</h2></div><span>SORT: VALUE ↓</span></div>
            <div className={styles.tableScroll}>
              <table className={styles.managerTable}>
                <thead><tr><th>MANAGER</th><th>CIK</th><th>PERIOD</th><th>FORM</th><th>POSITIONS</th><th>DISCLOSED VALUE</th><th>FILED</th></tr></thead>
                <tbody>
                  {[...dashboard].sort((left, right) => (right.portfolio?.totalValue ?? -1) - (left.portfolio?.totalValue ?? -1)).map((item) => (
                    <tr key={item.config.cik}>
                      <td>{item.config.slug === "berkshire-hathaway" ? <Link href="/investors/berkshire-hathaway">{item.config.displayName}</Link> : <b>{item.config.displayName}</b>}</td>
                      <td>{item.config.cik}</td><td>{item.portfolio?.filing.reportDate ?? "ERROR"}</td><td><span className={styles.form}>{item.portfolio?.filing.form ?? "—"}</span></td>
                      <td>{item.portfolio?.positions.length ?? "—"}</td><td><b>{item.portfolio ? formatMoney(item.portfolio.totalValue) : "UNAVAILABLE"}</b></td>
                      <td>{item.portfolio ? formatAccepted(item.portfolio.filing.acceptanceDateTime) : item.error?.slice(0, 30)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={styles.sourceNote}>SOURCE: SEC EDGAR FORM 13F INFORMATION TABLES · OFFICIAL DISCLOSED VALUES</p>
          </section>

          <aside className={styles.panel} id="filings">
            <div className={styles.panelHeader}><div><span>FEED 01</span><h2>Latest Filings</h2></div><i className={styles.feedDot} /></div>
            <ol className={styles.filingFeed}>
              {sortedFilings.map((portfolio, index) => (
                <li key={portfolio.cik}>
                  <time>{formatAccepted(portfolio.filing.acceptanceDateTime)}</time>
                  <div><span>{String(index + 1).padStart(2, "0")}</span><p><b>{displayNames.get(portfolio.cik) ?? portfolio.managerName}</b><small>{portfolio.filing.form} · {portfolio.filing.accessionNumber}</small></p></div>
                  <strong>{formatMoney(portfolio.totalValue)}</strong>
                </li>
              ))}
            </ol>
          </aside>
        </div>

        {berkshire ? (
          <section className={styles.panel} id="holdings">
            <div className={styles.panelHeader}>
              <div><span>TABLE 02 / CIK {berkshire.cik}</span><h2>Berkshire Hathaway — Top Holdings</h2></div>
              <Link href="/investors/berkshire-hathaway" className={styles.viewLink}>VIEW FULL PORTFOLIO →</Link>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.holdingsTable}>
                <thead><tr><th>#</th><th>ISSUER</th><th>PORTFOLIO WEIGHT</th><th>SHARES / PRN</th><th>DISCLOSED VALUE</th></tr></thead>
                <tbody>
                  {berkshire.positions.slice(0, 12).map((position, index) => (
                    <tr key={`${position.cusip}:${position.titleOfClass}`}>
                      <td>{String(index + 1).padStart(2, "0")}</td><td><b>{position.issuer}</b></td>
                      <td><div className={styles.weightCell}><span style={{ width: `${Math.min(position.weight * 3.5, 100)}%` }} /><b>{position.weight.toFixed(2)}%</b></div></td>
                      <td>{Math.round(position.shares).toLocaleString("en-US")}</td><td><b>{formatMoney(position.value)}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className={styles.methodology} id="methodology">
          <div><span>DATA CONTROL</span><h2>Source & Methodology</h2></div>
          <p>All portfolio figures on this page are parsed directly from the latest public SEC 13F information-table XML for each manager. Filing rows are normalized and aggregated by security identity. No estimated positions, market-price enrichment, or synthetic data is included.</p>
          <div className={styles.statusBox}><i /> <span>SEC DATA PIPELINE</span><b>OPERATIONAL</b></div>
        </section>
      </div>
    </main>
  );
}
