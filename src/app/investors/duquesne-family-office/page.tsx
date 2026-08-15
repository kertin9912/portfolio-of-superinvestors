import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("duquesne-family-office");

export default function Page() {
  return <ManagerPortfolioPage slug="duquesne-family-office" />;
}
