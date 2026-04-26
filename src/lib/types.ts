export interface Course {
  id: string
  title: string
  description: string | null
  cover_image: string | null
  status: 'draft' | 'published'
  sort_order: number
  created_at: string
  updated_at: string
  modules?: Module[]
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
  sections?: Section[]
  deliverables?: ModuleDeliverable[]
}

export interface Section {
  id: string
  module_id: string
  title: string
  video_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
  content_blocks?: ContentBlock[]
}

export interface ContentBlock {
  id: string
  section_id: string
  type: 'rich_text' | 'callout' | 'quote' | 'bucket' | 'table' | 'workbook_prompt' | 'checklist' | 'completion_checklist' | 'file' | 'video' | 'image' | 'structured_prompt' | 'fillable_table'
  content: Record<string, any>
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'student' | 'admin'
  onboarding_completed: boolean
  onboarding_data: Record<string, string | string[]> | null
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
}

export interface SectionProgress {
  id: string
  user_id: string
  section_id: string
  completed: boolean
  workbook_data: Record<string, any>
  completed_at: string | null
  updated_at: string
}

export interface ModuleProgress {
  id: string
  user_id: string
  module_id: string
  checklist_data: Record<string, any>
  completed: boolean
  completed_at: string | null
  updated_at: string
}

export interface ModuleDeliverable {
  id: string
  module_id: string
  label: string
  sort_order: number
}

export interface SectionNote {
  id: string
  user_id: string
  section_id: string
  content: string
  created_at: string
  updated_at: string
}
