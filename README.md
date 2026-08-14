# Signal 13F

A Bloomberg-inspired institutional holdings monitor built with Next.js 16 and deployed on Cloudflare Workers. Every displayed portfolio position is parsed from a live SEC EDGAR Form 13F filing; the application contains no mock holdings.

## Routes

- `/` — live reporting-manager dashboard, latest filings, and Berkshire top holdings
- `/investors/berkshire-hathaway` — current Berkshire portfolio, quarter-over-quarter activity, searchable information table, and original SEC source

## Data pipeline

The server fetches each manager's official `data.sec.gov/submissions/CIK##########.json`, resolves the latest `13F-HR` or `13F-HR/A`, locates the filing information-table XML, parses it, and aggregates duplicate rows by CUSIP and security class. Next.js revalidates SEC responses every 60 seconds.

13F values are disclosure-period figures from the filing, not live market quotes. The UI intentionally does not invent ticker symbols or enrich positions with unverified estimates.

Set a descriptive SEC user agent with a monitored contact address before production:

```bash
SEC_USER_AGENT="Signal13F admin@example.com"
```

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run build
npm exec -- opennextjs-cloudflare build
```

## Cloudflare deployment

OpenNext and Wrangler are already configured:

```bash
npm run preview
npm run deploy
```

Authenticate Wrangler and set the production `SEC_USER_AGENT` secret before deployment. The generated Bloomberg reference system from dembrandt is saved at `output/bloomberg.com/DESIGN.md`.
