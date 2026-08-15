import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 60;
export const metadata = managerMetadata("bridgewater-associates");

export default function Page() {
  return <ManagerPortfolioPage slug="bridgewater-associates" />;
}
