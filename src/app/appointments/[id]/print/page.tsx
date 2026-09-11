import AppointmentPrintPageClient from "./AppointmentPrintPageClient";

export const metadata = {
  title: "Print OPD Prescription Slip | Ghias Hospital",
  description: "Official OPD and Clinical Consultation Slip - A4 Standard Format",
};

export default async function AppointmentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <AppointmentPrintPageClient appointmentId={resolvedParams.id} />;
}
