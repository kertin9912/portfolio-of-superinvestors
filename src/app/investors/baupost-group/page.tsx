import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 60;
export const metadata = managerMetadata("baupost-group");

export default function Page() {
  return <ManagerPortfolioPage slug="baupost-group" />;
}
