import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const dynamic = "force-dynamic";
export const metadata = managerMetadata("situational-awareness");

export default function Page() {
  return <ManagerPortfolioPage slug="situational-awareness" />;
}
