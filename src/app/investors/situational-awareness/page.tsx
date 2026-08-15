import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("situational-awareness");

export default function Page() {
  return <ManagerPortfolioPage slug="situational-awareness" />;
}
