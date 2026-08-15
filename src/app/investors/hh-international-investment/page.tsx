import { ManagerPortfolioPage, managerMetadata } from "../[slug]/page";

export const revalidate = 900;
export const metadata = managerMetadata("hh-international-investment");

export default function Page() {
  return <ManagerPortfolioPage slug="hh-international-investment" />;
}
