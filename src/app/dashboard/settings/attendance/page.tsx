import { redirect } from "next/navigation";

export default function LegacyStaffAttendanceRedirect() {
  redirect("/dashboard/staff/attendance");
}
