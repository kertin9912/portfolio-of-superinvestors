import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("perseverance-asset-management");

export default function Page() {
  return <ManagerPortfolioPage slug="perseverance-asset-management" />;
}
