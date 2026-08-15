import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DoughnutChart } from "./doughnut-chart";
import { HoldingsTable, type HoldingTableRow } from "./holdings-table";
import styles from "./page.module.css";
import { formatDate, formatDateTime, formatMoney, formatPercent, getManagerBySlug, getPortfolioComparison, managers } from "@/lib/sec";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return managers.map((manager) => ({ slug: manager.slug }));
}

export function managerMetadata(slug: string): Metadata {
  const manager = getManagerBySlug(slug);
  return manager ? {
    title: `${manager.displayName} Holdings | Signal13F`,
    description: `Latest ${manager.displayName} portfolio holdings from official SEC Form 13F filings.`,
  } : {};
}

export async function generateMetadata({ params }: PageProps<"/investors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return managerMetadata(slug);
}

function TerminalHeader({ managerName }: { managerName: string }) {
  return (
    <>
      <div className={styles.blackBar}>
        <Link href="/" className={styles.brand}>SIGNAL<span>13F</span></Link>
        <span>INSTITUTIONAL HOLDINGS INTELLIGENCE</span>
        <div className={styles.live}><i /> PERSISTED SEC DATA</div>
      </div>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link href="/">MANAGERS</Link>
        <span className={styles.active}>{managerName.toUpperCase()}</span>
        <a href="#allocation">ALLOCATION</a>
        <a href="#holdings">HOLDINGS</a>
        <a href="#source">SOURCE</a>
      </nav>
    </>
  );
}

export async function ManagerPortfolioPage({ slug }: { slug: string }) {
  const manager = getManagerBySlug(slug);
  if (!manager) notFound();

  const comparison = await getPortfolioComparison(manager.cik);
  const { current, previous, positions, sold } = comparison;
  const topTenConcentration = positions.slice(0, 10).reduce((sum, position) => sum + position.weight, 0);
  const counts = { new: 0, added: 0, reduced: 0, unchanged: 0, sold: sold.length };
  const rows: HoldingTableRow[] = [];

  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    counts[position.activity.toLowerCase() as "new" | "added" | "reduced" | "unchanged"] += 1;
    rows.push({
      id: `${index}-${position.activity}`,
      issuer: position.issuer,
      value: position.value,
      shares: position.shares,
      weight: position.weight,
      activity: position.activity,
      shareChange: position.shareChange,
    });
  }

  return (
    <main>
      <TerminalHeader managerName={manager.displayName} />
      <div className={styles.contextBar}>
        <span>MANAGER <b>{manager.displayName.toUpperCase()}</b></span>
        <span>CIK <b>{current.cik}</b></span>
        <span>FORM <b>{current.filing.form}</b></span>
        <span>PERIOD <b>{formatDate(current.filing.reportDate)}</b></span>
        <span className={styles.contextStatus}><i /> VERIFIED SOURCE</span>
      </div>

      <div className={styles.shell}>
        <header className={styles.pageHeader}>
          <div>
            <p><Link href="/">13F MONITOR</Link> / MANAGER PROFILE</p>
            <h1>{manager.displayName}</h1>
            <span>{manager.profileLine.toUpperCase()}</span>
          </div>
          <div className={styles.filingStamp}>
            <span>LATEST SEC ACCEPTANCE</span>
            <b>{formatDateTime(current.filing.acceptanceDateTime)}</b>
            <small>ACCESSION {current.filing.accessionNumber}</small>
          </div>
        </header>

        <section className={styles.kpis} aria-label={`${manager.displayName} portfolio summary`}>
          <article><span>DISCLOSED VALUE</span><b>{formatMoney(current.totalValue)}</b><small className={(comparison.valueChange ?? 0) >= 0 ? styles.up : styles.down}>{formatPercent(comparison.valueChange)} VS PRIOR REPORT</small></article>
          <article><span>REPORTABLE POSITIONS</span><b>{positions.length}</b><small>{counts.new} NEW · {counts.sold} SOLD</small></article>
          <article><span>TOP 10 CONCENTRATION</span><b>{topTenConcentration.toFixed(1)}%</b><small>OF REPORTED 13F VALUE</small></article>
          <article><span>REPORTING PERIOD</span><b>{formatDate(current.filing.reportDate)}</b><small>FILED {formatDate(current.filing.filingDate)}</small></article>
        </section>

        <section className={styles.allocationPanel} id="allocation">
          <div className={styles.panelHeader}><div><span>CHART 01 / PORTFOLIO DISTRIBUTION</span><h2>Holdings Allocation</h2></div><span>% OF DISCLOSED VALUE</span></div>
          <DoughnutChart positions={current.positions} totalValue={current.totalValue} />
        </section>

        <section className={styles.activityPanel} id="activity">
          <div><span>TABLE 01 / QUARTERLY ACTIVITY</span><h2>Position Changes</h2></div>
          <div className={styles.activityGrid}>
            <article><span>NEW POSITIONS</span><b>{counts.new}</b></article>
            <article><span>ADDED</span><b className={styles.up}>{counts.added}</b></article>
            <article><span>REDUCED</span><b className={styles.down}>{counts.reduced}</b></article>
            <article><span>SOLD OUT</span><b className={styles.down}>{counts.sold}</b></article>
          </div>
          <dl className={styles.comparison}>
            <div><dt>CURRENT PERIOD</dt><dd>{formatDate(current.filing.reportDate)}</dd></div>
            <div><dt>PRIOR PERIOD</dt><dd>{previous ? formatDate(previous.filing.reportDate) : "—"}</dd></div>
            <div><dt>UNCHANGED</dt><dd>{counts.unchanged} POSITIONS</dd></div>
            <div><dt>VALUE CHANGE</dt><dd className={(comparison.valueChange ?? 0) >= 0 ? styles.up : styles.down}>{formatPercent(comparison.valueChange)}</dd></div>
          </dl>
        </section>

        <div id="holdings"><HoldingsTable rows={rows} /></div>

        <section className={styles.sourcePanel} id="source">
          <div><span>DATA CONTROL / SOURCE VERIFIED</span><h2>Official SEC filing record</h2><p>Positions are parsed from the filing&apos;s public XML information table and normalized by security identity. Activity compares reported share counts with the immediately preceding reporting period. No mock positions, inferred tickers, or estimated market prices are used.</p></div>
          <dl>
            <div><dt>SEC ACCEPTED</dt><dd>{formatDateTime(current.filing.acceptanceDateTime)}</dd></div>
            <div><dt>REPORT DATE</dt><dd>{formatDate(current.filing.reportDate)}</dd></div>
            <div><dt>ACCESSION</dt><dd>{current.filing.accessionNumber}</dd></div>
            <div><dt>DATA PIPELINE</dt><dd>PRE-FETCHED / PERSISTED</dd></div>
          </dl>
          <a href={current.filingUrl} target="_blank" rel="noreferrer">OPEN ORIGINAL SEC FILING ↗</a>
        </section>
      </div>
    </main>
  );
}

export default async function ManagerPage({ params }: PageProps<"/investors/[slug]">) {
  const { slug } = await params;
  return <ManagerPortfolioPage slug={slug} />;
}
