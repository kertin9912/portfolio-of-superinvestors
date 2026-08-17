import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("oriental-harbor");

export default function Page() {
  return <ManagerPortfolioPage slug="oriental-harbor" />;
}
