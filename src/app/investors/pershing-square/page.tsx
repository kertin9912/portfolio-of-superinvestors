import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("pershing-square");

export default function Page() {
  return <ManagerPortfolioPage slug="pershing-square" />;
}
