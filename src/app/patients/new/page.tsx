import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManagePatients } from "@/lib/rbac";
import PatientLayout from "@/components/layout/PatientLayout";
import PatientRegistrationForm from "./PatientRegistrationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Register Patient — GIAS Hospital" };

export default async function NewPatientPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canManagePatients(user.role)) {
    redirect("/patients");
  }

  return (
    <PatientLayout user={user}>
      <PatientRegistrationForm />
    </PatientLayout>
  );
}
