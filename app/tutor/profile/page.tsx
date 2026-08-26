import { redirect } from "next/navigation";

export default function TutorProfileRedirectPage() {
  redirect("/tutor?tab=profile");
}
