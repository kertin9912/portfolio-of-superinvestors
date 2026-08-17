import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("greenwoods-asset-management");

export default function Page() {
  return <ManagerPortfolioPage slug="greenwoods-asset-management" />;
}
