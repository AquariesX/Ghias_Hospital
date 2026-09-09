import ReferralPrintClient from "./ReferralPrintClient";

export const metadata = {
  title: "Print Referral Form | GIAS Hospital",
  description: "Official Patient Referral Document Record Copy",
};

export default async function ReferralPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ReferralPrintClient referralId={resolvedParams.id} />;
}
