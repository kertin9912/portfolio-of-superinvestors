import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 60;
export const metadata = managerMetadata("tiger-global");

export default function Page() {
  return <ManagerPortfolioPage slug="tiger-global" />;
}
