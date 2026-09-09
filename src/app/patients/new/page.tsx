import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewPatientPage() {
  // Streamlined reception workflow: Redirect directly to the complete Patient Admission Form
  redirect("/admissions");
}
