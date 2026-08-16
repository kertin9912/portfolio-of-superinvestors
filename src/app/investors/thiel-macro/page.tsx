import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("thiel-macro");

export default function Page() {
  return <ManagerPortfolioPage slug="thiel-macro" />;
}
