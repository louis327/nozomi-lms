import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const tools: Anthropic.Tool[] = [
  {
    name: 'create_course',
    description: 'Create a new course in the LMS',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Course title' },
        description: { type: 'string', description: 'Course description' },
        status: { type: 'string', enum: ['draft', 'published'], description: 'Course status' },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_module',
    description: 'Create a module inside a course',
    input_schema: {
      type: 'object' as const,
      properties: {
        course_id: { type: 'string', description: 'Course ID' },
        title: { type: 'string', description: 'Module title' },
        description: { type: 'string', description: 'Module description' },
        sort_order: { type: 'number', description: 'Sort order (0-based)' },
      },
      required: ['course_id', 'title'],
    },
  },
  {
    name: 'create_section',
    description: 'Create a section inside a module',
    input_schema: {
      type: 'object' as const,
      properties: {
        module_id: { type: 'string', description: 'Module ID' },
        title: { type: 'string', description: 'Section title' },
        sort_order: { type: 'number', description: 'Sort order (0-based)' },
      },
      required: ['module_id', 'title'],
    },
  },
  {
    name: 'create_content_block',
    description: 'Create a content block inside a section. Types: rich_text (content: {html}), callout (content: {calloutType: tip|warning|formula|key-insight, title, body}), table (content: {rows: string[][]}), workbook_prompt (content: {label, placeholder}), checklist (content: {title, description, items: string[]}), video (content: {url}), file (content: {label, fileUrl, fileName})',
    input_schema: {
      type: 'object' as const,
      properties: {
        section_id: { type: 'string', description: 'Section ID' },
        type: {
          type: 'string',
          enum: ['rich_text', 'callout', 'table', 'workbook_prompt', 'checklist', 'file', 'video'],
          description: 'Block type',
        },
        content: {
          type: 'object',
          description: 'Block content (structure depends on type)',
        },
        sort_order: { type: 'number', description: 'Sort order (0-based)' },
      },
      required: ['section_id', 'type', 'content'],
    },
  },
  {
    name: 'create_multiple_content_blocks',
    description: 'Create multiple content blocks at once in a section. More efficient than creating one at a time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        section_id: { type: 'string', description: 'Section ID' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['rich_text', 'callout', 'table', 'workbook_prompt', 'checklist', 'file', 'video'],
              },
              content: { type: 'object' },
              sort_order: { type: 'number' },
            },
            required: ['type', 'content', 'sort_order'],
          },
          description: 'Array of blocks to create',
        },
      },
      required: ['section_id', 'blocks'],
    },
  },
  {
    name: 'list_courses',
    description: 'List all courses in the LMS',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_course_structure',
    description: 'Get a course with all its modules, sections, and content blocks',
    input_schema: {
      type: 'object' as const,
      properties: {
        course_id: { type: 'string', description: 'Course ID' },
      },
      required: ['course_id'],
    },
  },
  {
    name: 'update_course',
    description: 'Update a course\'s title, description, or status',
    input_schema: {
      type: 'object' as const,
      properties: {
        course_id: { type: 'string', description: 'Course ID' },
        title: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'published'] },
      },
      required: ['course_id'],
    },
  },
  {
    name: 'update_module',
    description: 'Update a module\'s title or description',
    input_schema: {
      type: 'object' as const,
      properties: {
        module_id: { type: 'string', description: 'Module ID' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['module_id'],
    },
  },
  {
    name: 'update_section',
    description: 'Update a section\'s title',
    input_schema: {
      type: 'object' as const,
      properties: {
        section_id: { type: 'string', description: 'Section ID' },
        title: { type: 'string' },
      },
      required: ['section_id'],
    },
  },
  {
    name: 'delete_module',
    description: 'Delete a module and all its sections/content',
    input_schema: {
      type: 'object' as const,
      properties: {
        module_id: { type: 'string', description: 'Module ID' },
      },
      required: ['module_id'],
    },
  },
  {
    name: 'delete_section',
    description: 'Delete a section and all its content blocks',
    input_schema: {
      type: 'object' as const,
      properties: {
        section_id: { type: 'string', description: 'Section ID' },
      },
      required: ['section_id'],
    },
  },
  {
    name: 'delete_content_block',
    description: 'Delete a content block',
    input_schema: {
      type: 'object' as const,
      properties: {
        block_id: { type: 'string', description: 'Content block ID' },
      },
      required: ['block_id'],
    },
  },
  {
    name: 'update_content_block',
    description: 'Update an existing content block in place. Preserves block_id, sort_order, and any progress/highlights tied to it. Use this instead of delete+create when fixing or rewriting a block. Pass the full new content object — it replaces the previous content. Optionally change the type or sort_order.',
    input_schema: {
      type: 'object' as const,
      properties: {
        block_id: { type: 'string', description: 'Content block ID' },
        type: {
          type: 'string',
          enum: ['rich_text', 'callout', 'table', 'workbook_prompt', 'checklist', 'file', 'video'],
          description: 'New block type (optional). Only set if converting type.',
        },
        content: {
          type: 'object',
          description: 'Full replacement content object (structure depends on type).',
        },
        sort_order: { type: 'number', description: 'New sort order (optional).' },
      },
      required: ['block_id', 'content'],
    },
  },
]

type ToolInput = Record<string, unknown>

async function executeTool(name: string, input: ToolInput) {
  const supabase = createAdminClient()

  switch (name) {
    case 'create_course': {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: input.title as string,
          description: (input.description as string) || null,
          status: (input.status as string) || 'draft',
          sort_order: 0,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, course: data }
    }

    case 'create_module': {
      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: input.course_id as string,
          title: input.title as string,
          description: (input.description as string) || null,
          sort_order: (input.sort_order as number) ?? 0,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, module: data }
    }

    case 'create_section': {
      const { data, error } = await supabase
        .from('sections')
        .insert({
          module_id: input.module_id as string,
          title: input.title as string,
          sort_order: (input.sort_order as number) ?? 0,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, section: data }
    }

    case 'create_content_block': {
      const { data, error } = await supabase
        .from('content_blocks')
        .insert({
          section_id: input.section_id as string,
          type: input.type as string,
          content: input.content as Record<string, unknown>,
          sort_order: (input.sort_order as number) ?? 0,
        })
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, block: data }
    }

    case 'create_multiple_content_blocks': {
      const blocks = input.blocks as Array<{
        type: string
        content: Record<string, unknown>
        sort_order: number
      }>
      const rows = blocks.map((b) => ({
        section_id: input.section_id as string,
        type: b.type,
        content: b.content,
        sort_order: b.sort_order,
      }))
      const { data, error } = await supabase
        .from('content_blocks')
        .insert(rows)
        .select()
      if (error) return { error: error.message }
      return { success: true, blocks: data, count: data.length }
    }

    case 'list_courses': {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, description, status, created_at')
        .order('sort_order')
      if (error) return { error: error.message }
      return { courses: data }
    }

    case 'get_course_structure': {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', input.course_id as string)
        .single()
      if (courseError) return { error: courseError.message }

      const { data: modules } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', input.course_id as string)
        .order('sort_order')

      const moduleIds = (modules ?? []).map((m) => m.id)
      const { data: sections } = await supabase
        .from('sections')
        .select('*')
        .in('module_id', moduleIds.length ? moduleIds : [''])
        .order('sort_order')

      const sectionIds = (sections ?? []).map((s) => s.id)
      const { data: blocks } = await supabase
        .from('content_blocks')
        .select('*')
        .in('section_id', sectionIds.length ? sectionIds : [''])
        .order('sort_order')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocksBySection: Record<string, any[]> = {}
      ;(blocks ?? []).forEach((b) => {
        if (!blocksBySection[b.section_id]) blocksBySection[b.section_id] = []
        blocksBySection[b.section_id].push(b)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sectionsByModule: Record<string, any[]> = {}
      ;(sections ?? []).forEach((s) => {
        if (!sectionsByModule[s.module_id]) sectionsByModule[s.module_id] = []
        sectionsByModule[s.module_id].push({
          ...s,
          content_blocks: blocksBySection[s.id] ?? [],
        })
      })

      return {
        course: {
          ...course,
          modules: (modules ?? []).map((m) => ({
            ...m,
            sections: sectionsByModule[m.id] ?? [],
          })),
        },
      }
    }

    case 'update_course': {
      const updates: Record<string, unknown> = {}
      if (input.title) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      if (input.status) updates.status = input.status
      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', input.course_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'update_module': {
      const updates: Record<string, unknown> = {}
      if (input.title) updates.title = input.title
      if (input.description !== undefined) updates.description = input.description
      const { error } = await supabase
        .from('modules')
        .update(updates)
        .eq('id', input.module_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'update_section': {
      const updates: Record<string, unknown> = {}
      if (input.title) updates.title = input.title
      const { error } = await supabase
        .from('sections')
        .update(updates)
        .eq('id', input.section_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'delete_module': {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', input.module_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'delete_section': {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', input.section_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'delete_content_block': {
      const { error } = await supabase
        .from('content_blocks')
        .delete()
        .eq('id', input.block_id as string)
      if (error) return { error: error.message }
      return { success: true }
    }

    case 'update_content_block': {
      const updates: Record<string, unknown> = {
        content: input.content as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      }
      if (typeof input.type === 'string') updates.type = input.type
      if (typeof input.sort_order === 'number') updates.sort_order = input.sort_order
      const { data, error } = await supabase
        .from('content_blocks')
        .update(updates)
        .eq('id', input.block_id as string)
        .select()
        .single()
      if (error) return { error: error.message }
      return { success: true, block: data }
    }

    default:
      return { error: `Unknown tool: ${name}` }
  }
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { messages } = await request.json()

  const systemPrompt = `You are Nozomi AI, the admin assistant for Nozomi LMS. You help admins build and manage courses efficiently.

You have tools to create, update, and manage courses, modules, sections, and content blocks.

Content block types and their content structure:
- rich_text: { html: "<p>HTML content</p>" } — use proper HTML with <p>, <h2>, <h3>, <strong>, <em>, <ul>/<li>, <ol>/<li> tags
- callout: { calloutType: "tip"|"warning"|"formula"|"key-insight", title: "Title", body: "<p>HTML body</p>" }
- table: { rows: [["Header1", "Header2"], ["Cell1", "Cell2"]] } — first row is header. Cells starting with "=" are formulas, evaluated at render time. Refs use A1 style (column letter, 1-indexed row INCLUDING the header row, so the first body row is row 2). Functions: sum, avg, min, max, count, product, round. Operators: + - * /, parens, unary minus. Trailing % means percent (30% → 0.3). Examples: "=sum(B2:B6)" totals a column, "=B7*0.3" computes 30% of B7, "=B7+B8" sums two cells. Always prefer formulas over pre-computed values for budget tables, totals, buffers, etc., so the math stays live when line items change.
- workbook_prompt: { label: "Question text", placeholder: "Placeholder for student input" }
- checklist: { title: "Checklist Title", description: "Optional description", items: ["Item 1", "Item 2"] }
- video: { url: "https://youtube.com/..." }
- file: { label: "File description", fileUrl: "", fileName: "" }

When building courses from content:
1. Create the course first
2. Create modules with appropriate sort_order
3. Create sections within each module
4. Create content blocks within each section, using the correct block types
5. Use rich_text for prose/paragraphs, callout for tips/warnings/key insights, table for data tables, workbook_prompt for exercises, checklist for completion checklists

When creating rich_text blocks, format HTML properly:
- Use <h2> for section headings, <h3> for sub-headings
- Use <p> for paragraphs
- Use <strong> for bold, <em> for italic
- Use <ul>/<li> for bullet lists, <ol>/<li> for numbered lists

Use create_multiple_content_blocks when creating several blocks for a section — it's much faster.

When the admin asks you to fix, rewrite, or modify an existing block, use update_content_block — never delete + recreate. Updating in place preserves the block ID, which keeps student highlights, progress, and copy-link anchors intact. If you don't know the block_id, call get_course_structure first.

Be concise in your responses. After creating content, give a brief summary of what was created.

When the admin asks you to build a course from provided content, do it systematically section by section. Don't ask for confirmation — just build it.`

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        let currentMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))

        let loopCount = 0
        const maxLoops = 25

        while (loopCount < maxLoops) {
          loopCount++

          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8096,
            system: systemPrompt,
            tools,
            messages: currentMessages,
          })

          // Process response blocks
          let hasToolUse = false
          const toolResults: Anthropic.ToolResultBlockParam[] = []
          let textContent = ''

          for (const block of response.content) {
            if (block.type === 'text') {
              textContent += block.text
              send({ type: 'text', content: block.text })
            } else if (block.type === 'tool_use') {
              hasToolUse = true
              send({ type: 'tool_call', tool: block.name, input: block.input })

              const result = await executeTool(block.name, block.input as ToolInput)
              send({ type: 'tool_result', tool: block.name, result })

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(result),
              })
            }
          }

          if (!hasToolUse || response.stop_reason === 'end_turn') {
            break
          }

          // Continue the loop with tool results
          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: toolResults },
          ]
        }

        send({ type: 'done' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed'
        send({ type: 'error', content: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
