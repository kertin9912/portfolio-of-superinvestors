import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("berkshire-hathaway");

export default function Page() {
  return <ManagerPortfolioPage slug="berkshire-hathaway" />;
}
