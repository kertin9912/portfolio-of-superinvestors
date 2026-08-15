import Link from "next/link";
import styles from "./page.module.css";
import { ManagerDirectory, type ManagerDirectoryItem } from "./manager-directory";
import { formatMoney, getManagerDashboard } from "@/lib/sec";

export const revalidate = 900;

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
  const directoryItems: ManagerDirectoryItem[] = sorted.map((item) => ({
    cik: item.config.cik,
    slug: item.config.slug,
    displayName: item.config.displayName,
    profileLine: item.config.profileLine,
    searchText: `${item.config.displayName} ${item.config.aliases.join(" ")}`,
    initials: [item.config.displayName, ...item.config.aliases]
      .map((name) => name.trim().charAt(0).toUpperCase())
      .join(""),
    available: item.portfolio !== null,
    totalValue: item.portfolio ? formatMoney(item.portfolio.totalValue) : "—",
    positionCount: item.portfolio?.positions.length ?? null,
    reportDate: item.portfolio?.filing.reportDate ?? null,
    filedAt: item.portfolio ? formatAccepted(item.portfolio.filing.acceptanceDateTime) : null,
    error: item.error?.slice(0, 52) ?? null,
  }));

  return (
    <main>
      <TerminalHeader />
      <div className={styles.tape}>
        <span><b>MARKET</b> UNITED STATES</span>
        <span><b>FORM</b> 13F-HR</span>
        <span><b>FILING CHECK</b> DEADLINE WINDOW</span>
        <span><b>COVERAGE</b> {available.length}/{dashboard.length} ONLINE</span>
      </div>

      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div><p>13F MONITOR / REPORTING MANAGERS</p><h1>Superinvestor Holdings</h1></div>
          <div className={styles.marketTotal}><span>AGGREGATE DISCLOSED VALUE</span><b>{formatMoney(totalValue)}</b><small>LATEST PUBLIC SEC FILINGS</small></div>
        </header>

        <ManagerDirectory items={directoryItems} />

        <footer className={styles.dataNote}>
          <span>DATA CONTROL / SEC VERIFIED</span>
          <p>Portfolio values are parsed directly from each manager&apos;s latest public SEC Form 13F information table. Values represent the filing period, not live market prices.</p>
        </footer>
      </div>
    </main>
  );
}
