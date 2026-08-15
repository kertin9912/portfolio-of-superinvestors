import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("fundsmith");

export default function Page() {
  return <ManagerPortfolioPage slug="fundsmith" />;
}
