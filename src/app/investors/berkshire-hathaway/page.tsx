import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("berkshire-hathaway");

export default function Page() {
  return <ManagerPortfolioPage slug="berkshire-hathaway" />;
}
