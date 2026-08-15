import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("fundsmith");

export default function Page() {
  return <ManagerPortfolioPage slug="fundsmith" />;
}
