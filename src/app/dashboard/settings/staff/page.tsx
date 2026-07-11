import { redirect } from "next/navigation";

export default function LegacyStaffSettingsRedirect() {
  redirect("/dashboard/staff");
}
