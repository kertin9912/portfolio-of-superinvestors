import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("baupost-group");

export default function Page() {
  return <ManagerPortfolioPage slug="baupost-group" />;
}
