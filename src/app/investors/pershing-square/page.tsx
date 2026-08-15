import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("pershing-square");

export default function Page() {
  return <ManagerPortfolioPage slug="pershing-square" />;
}
