import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("third-point");

export default function Page() {
  return <ManagerPortfolioPage slug="third-point" />;
}
