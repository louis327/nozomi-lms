import { redirect } from 'next/navigation'

export default async function AdminEditSectionRedirect({
  params,
}: {
  params: Promise<{ courseId: string; sectionId: string }>
}) {
  const { courseId, sectionId } = await params
  redirect(`/courses/${courseId}/learn/${sectionId}`)
}
