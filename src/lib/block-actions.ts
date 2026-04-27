import type { ContentBlock } from '@/lib/types'

export async function saveBlock(blockId: string, content: Record<string, unknown>): Promise<ContentBlock> {
  const res = await fetch(`/api/admin/blocks/${blockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to save block')
  }
  return res.json()
}

export async function createBlock(
  sectionId: string,
  type: ContentBlock['type'],
  content: Record<string, unknown>,
  sortOrder: number
): Promise<ContentBlock> {
  const res = await fetch('/api/admin/blocks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section_id: sectionId, type, content, sort_order: sortOrder }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create block')
  }
  return res.json()
}

export async function duplicateBlock(
  sectionId: string,
  source: ContentBlock,
  sortOrder: number,
): Promise<ContentBlock> {
  const clonedContent = JSON.parse(JSON.stringify(source.content))
  return createBlock(sectionId, source.type, clonedContent, sortOrder)
}

export async function convertBlockType(
  blockId: string,
  type: ContentBlock['type'],
  content: Record<string, unknown>,
): Promise<ContentBlock> {
  const res = await fetch(`/api/admin/blocks/${blockId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to convert block')
  }
  return res.json()
}

export async function deleteBlock(blockId: string): Promise<void> {
  const res = await fetch(`/api/admin/blocks/${blockId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete block')
  }
}

export async function reorderBlocks(blocks: { id: string; sort_order: number }[]): Promise<void> {
  const res = await fetch('/api/admin/blocks/reorder', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to reorder blocks')
  }
}

export async function updateSectionTitle(sectionId: string, title: string): Promise<void> {
  const res = await fetch(`/api/admin/sections/${sectionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update section title')
  }
}

export function getDefaultContent(type: ContentBlock['type']): Record<string, unknown> {
  switch (type) {
    case 'rich_text': return { html: '' }
    case 'callout': return { calloutType: 'tip', callout_type: 'tip', title: '', body: '', html: '' }
    case 'quote': return { text: '', attribution: '' }
    case 'bucket': return { number: 1, eyebrow: 'Bucket 1', title: '', body: '', html: '' }
    case 'table': return { rows: [['', ''], ['', '']] }
    case 'workbook_prompt': return { label: '', placeholder: '', prompt: '', example: '' }
    case 'image': return { url: '', alt: '', caption: '', width: 'md', align: 'center' }
    case 'spacer': return { size: 'md' }
    case 'divider': return {}
    case 'checklist': return { items: [''] }
    case 'completion_checklist': return {
      title: '',
      subtitle: '',
      completionLabel: 'Complete before moving on',
      groups: [
        { heading: 'Group one', items: [{ label: '', hint: '' }] },
      ],
    }
    case 'file': return { fileUrl: '', label: '', fileName: '' }
    case 'video': return { url: '' }
    default: return {}
  }
}
