import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 60;
export const metadata = managerMetadata("himalaya-capital-management");

export default function Page() {
  return <ManagerPortfolioPage slug="himalaya-capital-management" />;
}
