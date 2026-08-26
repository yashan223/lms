import { redirect } from "next/navigation";

export default function InstructorProfileRedirectPage() {
  redirect("/tutor?tab=profile");
}
