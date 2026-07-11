import { redirect } from "next/navigation";

export default function StaffPermissionsRedirectPage() {
  redirect("/dashboard/staff");
}
