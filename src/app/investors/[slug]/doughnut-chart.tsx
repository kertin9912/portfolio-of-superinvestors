import type { Position } from "@/lib/sec";
import { formatMoney } from "@/lib/sec";
import styles from "./page.module.css";

const palette = ["#000000", "#ffcd1e", "#f05143", "#3274d9", "#4db250", "#8b5cf6", "#00a6a6", "#d97706", "#6b7280", "#c7c7c7"];

type Segment = { issuer: string; value: number; weight: number; color: string; offset: number };

function chartSegments(positions: Position[]): Segment[] {
  const byIssuer = new Map<string, { issuer: string; value: number; weight: number }>();
  for (const position of positions) {
    const current = byIssuer.get(position.issuer);
    byIssuer.set(position.issuer, {
      issuer: position.issuer,
      value: (current?.value ?? 0) + position.value,
      weight: (current?.weight ?? 0) + position.weight,
    });
  }

  const ranked = [...byIssuer.values()].toSorted((left, right) => right.value - left.value);
  const visible = ranked.slice(0, 9);
  const remainder = ranked.slice(9).reduce((total, position) => ({
    issuer: "OTHER REPORTED POSITIONS",
    value: total.value + position.value,
    weight: total.weight + position.weight,
  }), { issuer: "OTHER REPORTED POSITIONS", value: 0, weight: 0 });
  if (remainder.value > 0) visible.push(remainder);

  let offset = 0;
  return visible.map((position, index) => {
    const segment = { ...position, color: palette[index], offset };
    offset += position.weight;
    return segment;
  });
}

export function DoughnutChart({ positions, totalValue }: { positions: Position[]; totalValue: number }) {
  const segments = chartSegments(positions);
  return (
    <div className={styles.chartBody}>
      <div className={styles.doughnutWrap}>
        <svg className={styles.doughnut} viewBox="0 0 240 240" role="img" aria-label="Portfolio allocation doughnut chart">
          <circle cx="120" cy="120" r="84" pathLength="100" className={styles.chartTrack} />
          {segments.map((segment) => (
            <circle
              cx="120" cy="120" r="84" pathLength="100"
              className={styles.chartSegment}
              key={segment.issuer}
              stroke={segment.color}
              strokeDasharray={`${Math.max(segment.weight - 0.35, 0)} ${100 - Math.max(segment.weight - 0.35, 0)}`}
              strokeDashoffset={-segment.offset}
            />
          ))}
        </svg>
        <div className={styles.chartCenter}><span>DISCLOSED VALUE</span><b>{formatMoney(totalValue)}</b><small>{positions.length} POSITIONS</small></div>
      </div>
      <ol className={styles.chartLegend}>
        {segments.map((segment, index) => (
          <li key={segment.issuer}>
            <i style={{ background: segment.color }} />
            <span>{String(index + 1).padStart(2, "0")}</span>
            <b>{segment.issuer}</b>
            <strong>{segment.weight.toFixed(2)}%</strong>
            <em>{formatMoney(segment.value)}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}
