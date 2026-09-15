import { redirect } from "next/navigation";

export default async function TutorCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/tutor/courses/${courseId}/edit`);
}
