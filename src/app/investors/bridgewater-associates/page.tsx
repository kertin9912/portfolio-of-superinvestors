import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("bridgewater-associates");

export default function Page() {
  return <ManagerPortfolioPage slug="bridgewater-associates" />;
}
