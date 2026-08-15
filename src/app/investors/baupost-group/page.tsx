import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("baupost-group");

export default function Page() {
  return <ManagerPortfolioPage slug="baupost-group" />;
}
