import type { ContentBlock } from '@/lib/types'

export type WorkbookData = Record<string, unknown> & {
  _checklists?: Record<string, boolean>
}

export type ExtractedAnswer =
  | { kind: 'text'; prompt: string; answer: string }
  | { kind: 'fields'; prompt: string; fields: { label: string; value: string }[] }
  | {
      kind: 'table'
      prompt: string
      columns: string[]
      rows: { value: string; editable: boolean }[][]
    }
  | { kind: 'checklist'; prompt: string; items: { label: string; checked: boolean }[] }
  | {
      kind: 'completion_checklist'
      prompt: string
      subtitle: string
      groups: {
        heading: string
        items: { label: string; hint: string; checked: boolean }[]
      }[]
    }

export function extractAnswer(
  block: ContentBlock,
  data: WorkbookData | null | undefined,
): ExtractedAnswer | null {
  const wb = (data ?? {}) as WorkbookData
  const content = block.content ?? {}

  switch (block.type) {
    case 'workbook_prompt': {
      const prompt =
        (content.label as string) ||
        (content.prompt as string) ||
        'Your response'
      const answer = (wb[block.id] as string) ?? ''
      return { kind: 'text', prompt, answer }
    }

    case 'structured_prompt': {
      const prompt = (content.label as string) || 'Your responses'
      const spFields =
        (content.fields as Array<{
          key: string
          label: string
          prefix?: string
          suffix?: string
        }>) ?? []
      const fields = spFields.map((f) => {
        const raw = (wb[`${block.id}_${f.key}`] as string) ?? ''
        const value = raw
          ? `${f.prefix ?? ''}${raw}${f.suffix ?? ''}`
          : ''
        return { label: f.label, value }
      })
      return { kind: 'fields', prompt, fields }
    }

    case 'fillable_table': {
      const prompt = (content.label as string) || 'Table'
      const columns = (content.columns as string[]) ?? []
      const ftRows =
        (content.rows as Array<{
          cells: Array<{
            value: string
            editable: boolean
            prefix?: string
            suffix?: string
          }>
        }>) ?? []
      const rows = ftRows.map((row, ri) =>
        row.cells.map((cell, ci) => {
          if (!cell.editable) {
            return { value: cell.value, editable: false }
          }
          const raw = (wb[`${block.id}_r${ri}_c${ci}`] as string) ?? ''
          const value = raw
            ? `${cell.prefix ?? ''}${raw}${cell.suffix ?? ''}`
            : ''
          return { value, editable: true }
        }),
      )
      return { kind: 'table', prompt, columns, rows }
    }

    case 'checklist': {
      const prompt = (content.title as string) || 'Checklist'
      const checklists = wb._checklists ?? {}
      const items = ((content.items as string[]) ?? []).map((label, i) => ({
        label,
        checked: Boolean(checklists[`${block.id}_${i}`]),
      }))
      return { kind: 'checklist', prompt, items }
    }

    case 'completion_checklist': {
      const prompt = (content.title as string) || 'Completion checklist'
      const subtitle = (content.subtitle as string) || ''
      const checklists = wb._checklists ?? {}
      const rawGroups =
        (content.groups as Array<{
          heading?: string
          items?: Array<{ label?: string; hint?: string }>
        }>) ?? []
      const groups = rawGroups.map((g, gi) => ({
        heading: g.heading ?? '',
        items: (g.items ?? []).map((item, ii) => ({
          label: item.label ?? '',
          hint: item.hint ?? '',
          checked: Boolean(checklists[`${block.id}_g${gi}_i${ii}`]),
        })),
      }))
      return { kind: 'completion_checklist', prompt, subtitle, groups }
    }

    default:
      return null
  }
}

export function extractSectionAnswers(
  blocks: ContentBlock[],
  data: WorkbookData | null | undefined,
): ExtractedAnswer[] {
  return blocks
    .map((b) => extractAnswer(b, data))
    .filter((a): a is ExtractedAnswer => a !== null)
}

export function sectionHasPrompts(blocks: ContentBlock[]): boolean {
  return blocks.some(
    (b) =>
      b.type === 'workbook_prompt' ||
      b.type === 'structured_prompt' ||
      b.type === 'fillable_table' ||
      b.type === 'checklist' ||
      b.type === 'completion_checklist',
  )
}
