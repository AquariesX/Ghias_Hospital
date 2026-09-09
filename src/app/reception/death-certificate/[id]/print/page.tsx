import DeathCertificatePrintClient from "./DeathCertificatePrintClient";

export const metadata = {
  title: "Print Death Certificate | GIAS Hospital",
  description: "Official Death Certificate Document Copy",
};

export default async function DeathCertificatePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <DeathCertificatePrintClient certificateId={resolvedParams.id} />;
}
