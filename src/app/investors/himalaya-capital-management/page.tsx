import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("himalaya-capital-management");

export default function Page() {
  return <ManagerPortfolioPage slug="himalaya-capital-management" />;
}
