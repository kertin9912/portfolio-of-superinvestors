import Link from "next/link";
import styles from "./page.module.css";
import { formatMoney, getManagerDashboard } from "@/lib/sec";

export const revalidate = 60;

function formatAccepted(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "America/New_York",
  }).format(new Date(value)).toUpperCase();
}

function TerminalHeader() {
  return (
    <>
      <div className={styles.blackBar}>
        <Link href="/" className={styles.brand}>SIGNAL<span>13F</span></Link>
        <span>INSTITUTIONAL HOLDINGS INTELLIGENCE</span>
        <div className={styles.live}><i /> SEC EDGAR LIVE</div>
      </div>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link href="/" className={styles.active}>MANAGERS</Link>
        <a href="#coverage">COVERAGE</a>
        <span className={styles.shortcut}>DATA SOURCE <kbd>SEC</kbd></span>
      </nav>
    </>
  );
}

export default async function Home() {
  const dashboard = await getManagerDashboard();
  const available = dashboard.flatMap((item) => item.portfolio ? [item.portfolio] : []);
  const totalValue = available.reduce((sum, portfolio) => sum + portfolio.totalValue, 0);
  const sorted = dashboard.toSorted((left, right) => (right.portfolio?.totalValue ?? -1) - (left.portfolio?.totalValue ?? -1));

  return (
    <main>
      <TerminalHeader />
      <div className={styles.tape}>
        <span><b>MARKET</b> UNITED STATES</span>
        <span><b>FORM</b> 13F-HR</span>
        <span><b>REFRESH</b> 60 SEC</span>
        <span><b>COVERAGE</b> {available.length}/{dashboard.length} ONLINE</span>
      </div>

      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div><p>13F MONITOR / REPORTING MANAGERS</p><h1>Superinvestor Holdings</h1></div>
          <div className={styles.marketTotal}><span>AGGREGATE DISCLOSED VALUE</span><b>{formatMoney(totalValue)}</b><small>LATEST PUBLIC SEC FILINGS</small></div>
        </header>

        <section className={styles.managerGrid} id="coverage" aria-label="Tracked investment managers">
          {sorted.map((item, index) => (
            <article className={styles.managerCard} key={item.config.cik}>
              <div className={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</div>
              <div className={styles.cardStatus}><i className={item.portfolio ? styles.online : styles.offline} /> {item.portfolio ? "LIVE" : "UNAVAILABLE"}</div>
              <p>CIK {item.config.cik}</p>
              <h2>{item.config.displayName}</h2>
              <strong>{item.portfolio ? formatMoney(item.portfolio.totalValue) : "—"}</strong>
              <dl>
                <div><dt>POSITIONS</dt><dd>{item.portfolio?.positions.length ?? "—"}</dd></div>
                <div><dt>REPORTING PERIOD</dt><dd>{item.portfolio?.filing.reportDate ?? "—"}</dd></div>
                <div><dt>FILED</dt><dd>{item.portfolio ? formatAccepted(item.portfolio.filing.acceptanceDateTime) : "—"}</dd></div>
              </dl>
              {item.portfolio ? <Link href={`/investors/${item.config.slug}`}>VIEW HOLDINGS <span>→</span></Link> : <span className={styles.error}>{item.error?.slice(0, 52)}</span>}
            </article>
          ))}
        </section>

        <footer className={styles.dataNote}>
          <span>DATA CONTROL / SEC VERIFIED</span>
          <p>Portfolio values are parsed directly from each manager&apos;s latest public SEC Form 13F information table. Values represent the filing period, not live market prices.</p>
        </footer>
      </div>
    </main>
  );
}
