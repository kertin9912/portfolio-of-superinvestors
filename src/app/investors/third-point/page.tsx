import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("third-point");

export default function Page() {
  return <ManagerPortfolioPage slug="third-point" />;
}
