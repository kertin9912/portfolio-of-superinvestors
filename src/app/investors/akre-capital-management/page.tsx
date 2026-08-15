import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("akre-capital-management");

export default function Page() {
  return <ManagerPortfolioPage slug="akre-capital-management" />;
}
