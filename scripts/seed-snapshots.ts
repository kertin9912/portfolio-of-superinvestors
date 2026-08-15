import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ingestManager } from "../src/lib/sec-ingestion";
import { managers, portfolioKey } from "../src/lib/portfolio";

async function main(): Promise<void> {
  const outputArgument = process.argv[2];
  if (!outputArgument) throw new Error("Usage: tsx scripts/seed-snapshots.ts <output-directory>");

  const outputDirectory = resolve(outputArgument);
  await mkdir(outputDirectory, { recursive: true });

  for (const manager of managers) {
    process.stderr.write(`Fetching ${manager.slug}... `);
    const result = await ingestManager(manager, "Signal13F holdings monitor kkertin1214@gmail.com", null);
    const fileName = `${manager.cik}.json`;
    await writeFile(resolve(outputDirectory, fileName), JSON.stringify(result.snapshot), { encoding: "utf8", flag: "wx" });
    process.stderr.write(`${result.snapshot.comparison.current.positions.length} positions\n`);
    process.stdout.write(`${portfolioKey(manager.cik)}\t${fileName}\n`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Snapshot seeding failed");
  process.exitCode = 1;
});
