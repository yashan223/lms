import { redirect } from "next/navigation";

export default function TutorCoursesPage() {
  redirect("/tutor?tab=courses");
}
