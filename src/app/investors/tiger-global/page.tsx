import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("tiger-global");

export default function Page() {
  return <ManagerPortfolioPage slug="tiger-global" />;
}
