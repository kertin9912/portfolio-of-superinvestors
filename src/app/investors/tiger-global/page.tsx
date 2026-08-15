import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("tiger-global");

export default function Page() {
  return <ManagerPortfolioPage slug="tiger-global" />;
}
