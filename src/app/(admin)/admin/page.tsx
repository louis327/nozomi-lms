import { createAdminClient } from '@/lib/supabase/admin'
import {
  BookOpen,
  Users,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()

  // Fetch all stats in parallel
  const [coursesRes, enrollmentsRes, completionsRes, recentEnrollmentsRes] =
    await Promise.all([
      supabase.from('courses').select('id, status'),
      supabase.from('enrollments').select('id'),
      supabase.from('section_progress').select('id').eq('completed', true),
      supabase
        .from('enrollments')
        .select('id, enrolled_at, user_id, course_id, profiles(full_name, email), courses(title)')
        .order('enrolled_at', { ascending: false })
        .limit(10),
    ])

  const courses = coursesRes.data ?? []
  const publishedCount = courses.filter((c) => c.status === 'published').length
  const draftCount = courses.filter((c) => c.status === 'draft').length
  const totalEnrolled = enrollmentsRes.data?.length ?? 0
  const totalCompletions = completionsRes.data?.length ?? 0
  const recentEnrollments = recentEnrollmentsRes.data ?? []

  const stats = [
    {
      label: 'Total Courses',
      value: courses.length,
      sub: `${publishedCount} published, ${draftCount} draft`,
      icon: BookOpen,
      color: 'text-nz-sakura',
      bgColor: 'bg-nz-sakura/10',
    },
    {
      label: 'Enrolled Students',
      value: totalEnrolled,
      sub: 'Total enrollments',
      icon: Users,
      color: 'text-nz-info',
      bgColor: 'bg-nz-info/10',
    },
    {
      label: 'Section Completions',
      value: totalCompletions,
      sub: 'Across all courses',
      icon: CheckCircle,
      color: 'text-nz-success',
      bgColor: 'bg-nz-success/10',
    },
    {
      label: 'Conversion Rate',
      value: totalEnrolled > 0 ? `${Math.round((totalCompletions / totalEnrolled) * 100)}%` : '0%',
      sub: 'Completions / enrollments',
      icon: TrendingUp,
      color: 'text-nz-warning',
      bgColor: 'bg-nz-warning/10',
    },
  ]

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-nz-text-primary mb-8">
        Dashboard
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="bg-nz-bg-card border border-nz-border rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm text-nz-text-secondary">{stat.label}</span>
              </div>
              <p className="text-3xl font-heading font-bold text-nz-text-primary">
                {stat.value}
              </p>
              <p className="text-xs text-nz-text-tertiary mt-1">{stat.sub}</p>
            </div>
          )
        })}
      </div>

      {/* Recent enrollments */}
      <div className="bg-nz-bg-card border border-nz-border rounded-2xl p-6">
        <h2 className="font-heading text-lg font-semibold text-nz-text-primary mb-4">
          Recent Enrollments
        </h2>
        {recentEnrollments.length === 0 ? (
          <p className="text-nz-text-tertiary text-sm py-8 text-center">
            No enrollments yet.
          </p>
        ) : (
          <div className="space-y-3">
            {recentEnrollments.map((enrollment: Record<string, unknown>) => {
              const profile = enrollment.profiles as Record<string, string> | null
              const course = enrollment.courses as Record<string, string> | null
              return (
                <div
                  key={enrollment.id as string}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-nz-bg-elevated/50 border border-nz-border/50"
                >
                  <div>
                    <p className="text-sm text-nz-text-primary font-medium">
                      {profile?.full_name || profile?.email || 'Unknown'}
                    </p>
                    <p className="text-xs text-nz-text-tertiary">
                      Enrolled in {course?.title || 'Unknown course'}
                    </p>
                  </div>
                  <span className="text-xs text-nz-text-muted">
                    {new Date(enrollment.enrolled_at as string).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
