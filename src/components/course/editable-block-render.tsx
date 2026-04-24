'use client'

import { ReactNode } from 'react'
import { Callout } from '@/components/ui/callout'
import { VideoEmbed } from '@/components/course/video-embed'
import { RichTextEditor } from '@/components/admin/rich-text-editor'
import {
  Check,
  ChevronDown,
  Download,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import type { ContentBlock } from '@/lib/types'

type Props = {
  block: ContentBlock
  onChange: (content: Record<string, unknown>) => void
}

const inheritStyle: React.CSSProperties = {
  font: 'inherit',
  color: 'inherit',
  letterSpacing: 'inherit',
  lineHeight: 'inherit',
  fontStyle: 'inherit',
  fontWeight: 'inherit',
}

function EditableText({
  value,
  onChange,
  placeholder,
  className = '',
  multiline = false,
  rows = 3,
  inheritFont = true,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
  rows?: number
  inheritFont?: boolean
  style?: React.CSSProperties
}) {
  const base =
    'w-full bg-transparent rounded-md border border-dashed border-line/50 hover:border-line focus:border-accent/50 focus:outline-none focus:bg-accent-soft/10 px-2 py-1 transition-colors'
  if (multiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${base} resize-y ${className}`}
        style={inheritFont ? { ...inheritStyle, ...style } : style}
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${base} ${className}`}
      style={inheritFont ? { ...inheritStyle, ...style } : style}
    />
  )
}

function SmallButton({
  onClick,
  children,
  title,
  tone = 'default',
}: {
  onClick: () => void
  children: ReactNode
  title?: string
  tone?: 'default' | 'danger'
}) {
  const colors =
    tone === 'danger'
      ? 'text-ink-muted hover:text-error hover:bg-error/10'
      : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer ${colors}`}
    >
      {children}
    </button>
  )
}

function AddButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-muted hover:text-accent transition-colors cursor-pointer"
    >
      <Plus className="w-3 h-3" strokeWidth={2.2} />
      {label}
    </button>
  )
}

function DoBlockShell({
  labelValue,
  onLabelChange,
  children,
}: {
  labelValue: string
  onLabelChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div className="my-8">
      <EditableText
        value={labelValue}
        onChange={onLabelChange}
        placeholder="Prompt label"
        className="mb-3"
        style={{
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
          color: 'var(--nz-accent)',
        }}
        inheritFont={false}
      />
      {children}
    </div>
  )
}

export function EditableBlockRender({ block, onChange }: Props) {
  const update = (partial: Record<string, unknown>) =>
    onChange({ ...block.content, ...partial })

  switch (block.type) {
    case 'rich_text': {
      return (
        <div className="prose-nozomi">
          <RichTextEditor
            content={(block.content.html as string) || ''}
            onChange={(html) => update({ html })}
            placeholder="Write your content..."
          />
        </div>
      )
    }

    case 'callout': {
      const ct =
        (block.content.calloutType as string) ||
        (block.content.callout_type as string) ||
        'tip'
      const title = (block.content.title as string) || ''
      const body =
        (block.content.body as string) ||
        (block.content.html as string) ||
        ''

      return (
        <div className="relative">
          <div className="absolute -top-3 right-0 z-10 flex items-center gap-1 bg-surface border border-line rounded-full shadow-sm px-2 py-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              Style
            </span>
            <div className="relative">
              <select
                value={ct}
                onChange={(e) =>
                  update({
                    calloutType: e.target.value,
                    callout_type: e.target.value,
                  })
                }
                className="appearance-none bg-transparent pr-5 pl-2 py-0.5 text-[11px] font-semibold text-ink focus:outline-none cursor-pointer"
              >
                <option value="tip">Tip</option>
                <option value="warning">Warning</option>
                <option value="formula">Formula</option>
                <option value="key-insight">Key insight</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ink-muted absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <Callout
            type={ct as 'tip' | 'warning' | 'formula' | 'key-insight'}
            title={title || undefined}
          >
            <EditableText
              value={title}
              onChange={(v) => update({ title: v })}
              placeholder="Optional title — defaults to style name"
              className="mb-2"
              style={{ fontSize: '13px' }}
              inheritFont={false}
            />
            <RichTextEditor
              content={body}
              onChange={(html) => update({ body: html, html })}
              placeholder="Callout body..."
            />
          </Callout>
        </div>
      )
    }

    case 'quote': {
      const text = (block.content.text as string) || (block.content.html as string) || ''
      const attribution = (block.content.attribution as string) || ''
      return (
        <figure
          className="my-6 px-6 py-4"
          style={{
            background: '#faf1df',
            borderLeft: '6px solid #c69a3f',
            borderRadius: '2px',
          }}
        >
          <blockquote
            className="text-[16px] leading-[1.55] italic"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#2a2a2a' }}
          >
            <RichTextEditor
              content={text}
              onChange={(html) => update({ text: html, html })}
              placeholder="Quote text…"
            />
          </blockquote>
          <figcaption
            className="mt-2 text-[13px] not-italic"
            style={{ color: '#6b6b6b', fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            <EditableText
              value={attribution}
              onChange={(v) => update({ attribution: v })}
              placeholder="— attribution (optional)"
              inheritFont={false}
              style={{ fontSize: '13px', color: '#6b6b6b', fontFamily: 'Georgia, "Times New Roman", serif' }}
            />
          </figcaption>
        </figure>
      )
    }

    case 'table': {
      const rows = (block.content.rows as string[][]) || [
        ['Column 1', 'Column 2'],
        ['', ''],
      ]
      const headers = rows[0] ?? []
      const bodyRows = rows.slice(1)

      const setCell = (ri: number, ci: number, v: string) => {
        const next = rows.map((r, i) =>
          i === ri ? r.map((c, j) => (j === ci ? v : c)) : [...r],
        )
        update({ rows: next })
      }
      const addRow = () => {
        const cols = headers.length || 2
        update({ rows: [...rows, Array(cols).fill('')] })
      }
      const removeRow = (ri: number) => {
        if (ri === 0 && rows.length > 1) return
        update({ rows: rows.filter((_, i) => i !== ri) })
      }
      const addCol = () => {
        update({ rows: rows.map((r) => [...r, '']) })
      }
      const removeCol = (ci: number) => {
        if (headers.length <= 1) return
        update({ rows: rows.map((r) => r.filter((_, i) => i !== ci)) })
      }

      return (
        <div className="my-5">
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table
              className="w-full text-[14px]"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2.5 text-left border border-line bg-surface-muted relative group"
                    >
                      <div className="flex items-center gap-1">
                        <EditableText
                          value={h}
                          onChange={(v) => setCell(0, i, v)}
                          placeholder="Header"
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--nz-ink)',
                          }}
                          inheritFont={false}
                        />
                        {headers.length > 1 && (
                          <SmallButton
                            onClick={() => removeCol(i)}
                            tone="danger"
                            title="Remove column"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                          </SmallButton>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, bi) => {
                  const ri = bi + 1
                  return (
                    <tr key={ri} className="group">
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="px-4 py-2.5 border border-line text-ink align-top"
                        >
                          <div className="flex items-center gap-1">
                            <EditableText
                              value={cell}
                              onChange={(v) => setCell(ri, ci, v)}
                              placeholder="Value"
                              inheritFont={true}
                            />
                            {ci === row.length - 1 && rows.length > 2 && (
                              <SmallButton
                                onClick={() => removeRow(ri)}
                                tone="danger"
                                title="Remove row"
                              >
                                <X className="w-3 h-3" strokeWidth={2} />
                              </SmallButton>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <AddButton onClick={addRow} label="Add row" />
            <AddButton onClick={addCol} label="Add column" />
          </div>
        </div>
      )
    }

    case 'workbook_prompt': {
      const label =
        (block.content.label as string) ||
        (block.content.prompt as string) ||
        ''
      const placeholder = (block.content.placeholder as string) || ''
      const example = (block.content.example as string) || ''
      return (
        <DoBlockShell
          labelValue="Your response"
          onLabelChange={() => {}}
        >
          <EditableText
            value={label}
            onChange={(v) => update({ label: v, prompt: v })}
            placeholder="Question text"
            multiline
            rows={2}
            style={{ fontSize: '17px', color: 'var(--nz-ink)', fontWeight: 600, lineHeight: '1.5' }}
            inheritFont={false}
          />
          <div className="mt-2 pl-3 border-l-2 border-line">
            <span className="text-[13px] text-ink-muted italic">e.g. </span>
            <EditableText
              value={example}
              onChange={(v) => update({ example: v })}
              placeholder="add an example (optional)"
              multiline
              rows={1}
              style={{
                fontSize: '13px',
                color: 'var(--nz-ink-muted)',
                fontStyle: 'italic',
                lineHeight: '1.5',
                display: 'inline',
              }}
              inheritFont={false}
            />
          </div>
          <div className="mt-4 border-b border-line pb-2">
            <EditableText
              value={placeholder}
              onChange={(v) => update({ placeholder: v })}
              placeholder="Placeholder text for the student's answer line"
              style={{
                fontSize: '14px',
                color: 'var(--nz-ink-faint)',
                fontStyle: 'italic',
              }}
              inheritFont={false}
            />
          </div>
        </DoBlockShell>
      )
    }

    case 'checklist': {
      const title = (block.content.title as string) || ''
      const description = (block.content.description as string) || ''
      const items = (block.content.items as string[]) || []

      const setItem = (i: number, v: string) =>
        update({ items: items.map((it, idx) => (idx === i ? v : it)) })
      const addItem = () => update({ items: [...items, ''] })
      const removeItem = (i: number) =>
        update({ items: items.filter((_, idx) => idx !== i) })

      return (
        <DoBlockShell
          labelValue={title}
          onLabelChange={(v) => update({ title: v })}
        >
          <EditableText
            value={description}
            onChange={(v) => update({ description: v })}
            placeholder="Optional description..."
            className="mb-3"
            style={{ fontSize: '13px', color: 'var(--nz-ink-soft)' }}
            inheritFont={false}
          />
          <div className="space-y-1">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-3 py-2 rounded-lg group -mx-3"
              >
                <input
                  type="checkbox"
                  disabled
                  className="mt-1 w-4 h-4 rounded border-line accent-[var(--nz-accent)] opacity-60"
                />
                <EditableText
                  value={item}
                  onChange={(v) => setItem(i, v)}
                  placeholder="Checklist item..."
                  style={{ fontSize: '14px', color: 'var(--nz-ink-soft)' }}
                  inheritFont={false}
                />
                <SmallButton
                  onClick={() => removeItem(i)}
                  tone="danger"
                  title="Remove item"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </SmallButton>
              </div>
            ))}
          </div>
          <div className="mt-3 pl-3">
            <AddButton onClick={addItem} label="Add item" />
          </div>
        </DoBlockShell>
      )
    }

    case 'completion_checklist': {
      const title = (block.content.title as string) || ''
      const subtitle = (block.content.subtitle as string) || ''
      const completionLabel =
        (block.content.completionLabel as string) ||
        'Complete before moving on'
      const groups =
        (block.content.groups as Array<{
          heading: string
          items: Array<{ label: string; hint?: string }>
        }>) || []

      const setGroup = (gi: number, patch: Partial<(typeof groups)[number]>) =>
        update({
          groups: groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)),
        })
      const addGroup = () =>
        update({
          groups: [
            ...groups,
            { heading: 'New group', items: [{ label: '', hint: '' }] },
          ],
        })
      const removeGroup = (gi: number) =>
        update({ groups: groups.filter((_, i) => i !== gi) })
      const setItem = (
        gi: number,
        ii: number,
        patch: Partial<(typeof groups)[number]['items'][number]>,
      ) =>
        setGroup(gi, {
          items: groups[gi].items.map((it, i) =>
            i === ii ? { ...it, ...patch } : it,
          ),
        })
      const addItem = (gi: number) =>
        setGroup(gi, { items: [...groups[gi].items, { label: '', hint: '' }] })
      const removeItem = (gi: number, ii: number) =>
        setGroup(gi, {
          items: groups[gi].items.filter((_, i) => i !== ii),
        })

      const totalCount = groups.reduce((a, g) => a + g.items.length, 0)

      return (
        <div className="my-8 rounded-2xl border border-line bg-surface overflow-hidden">
          <div className="px-6 lg:px-8 py-6 border-b border-line-soft bg-surface-muted/50">
            <EditableText
              value={completionLabel}
              onChange={(v) => update({ completionLabel: v })}
              placeholder="Eyebrow label"
              className="mb-2"
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: 'var(--nz-accent)',
              }}
              inheritFont={false}
            />
            <EditableText
              value={title}
              onChange={(v) => update({ title: v })}
              placeholder="Section title"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '24px',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: 'var(--nz-ink)',
              }}
              inheritFont={false}
            />
            <EditableText
              value={subtitle}
              onChange={(v) => update({ subtitle: v })}
              placeholder="Optional subtitle (shown below title)"
              multiline
              rows={2}
              className="mt-2"
              style={{
                fontSize: '14px',
                color: 'var(--nz-ink-soft)',
                lineHeight: 1.55,
              }}
              inheritFont={false}
            />
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-[6px] rounded-full bg-line-soft overflow-hidden">
                <div className="h-full rounded-full bg-accent/40" style={{ width: '0%' }} />
              </div>
              <span className="text-[11px] font-mono tabular-nums tracking-wider uppercase text-ink-muted shrink-0">
                0 / {totalCount} checked
              </span>
            </div>
          </div>

          <div className="divide-y divide-line-soft">
            {groups.map((group, gi) => (
              <div key={gi} className="px-6 lg:px-8 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <EditableText
                    value={group.heading || ''}
                    onChange={(v) => setGroup(gi, { heading: v })}
                    placeholder="Group heading"
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.24em',
                      color: 'var(--nz-ink-muted)',
                    }}
                    inheritFont={false}
                  />
                  <SmallButton
                    onClick={() => removeGroup(gi)}
                    tone="danger"
                    title="Remove group"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                  </SmallButton>
                </div>
                <div className="space-y-2">
                  {group.items.map((item, ii) => (
                    <div
                      key={ii}
                      className="flex items-start gap-3 px-3 py-2 -mx-3 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        disabled
                        className="mt-[6px] w-4 h-4 rounded border-line accent-[var(--nz-accent)] opacity-60 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <EditableText
                          value={item.label || ''}
                          onChange={(v) => setItem(gi, ii, { label: v })}
                          placeholder="Item label"
                          style={{
                            fontSize: '14px',
                            color: 'var(--nz-ink)',
                            lineHeight: 1.5,
                          }}
                          inheritFont={false}
                        />
                        <EditableText
                          value={item.hint || ''}
                          onChange={(v) => setItem(gi, ii, { hint: v })}
                          placeholder="Optional clarifying sub-line"
                          className="mt-1"
                          style={{
                            fontSize: '12.5px',
                            color: 'var(--nz-ink-soft)',
                            lineHeight: 1.5,
                          }}
                          inheritFont={false}
                        />
                      </div>
                      <SmallButton
                        onClick={() => removeItem(gi, ii)}
                        tone="danger"
                        title="Remove item"
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </SmallButton>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pl-3">
                  <AddButton
                    onClick={() => addItem(gi)}
                    label="Add item"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 lg:px-8 py-4 border-t border-line-soft bg-surface-muted/30">
            <AddButton onClick={addGroup} label="Add group" />
          </div>
        </div>
      )
    }

    case 'file': {
      const label = (block.content.label as string) || ''
      const fileName =
        (block.content.fileName as string) ||
        (block.content.filename as string) ||
        ''
      const fileUrl =
        (block.content.fileUrl as string) || (block.content.url as string) || ''
      const description = (block.content.description as string) || ''

      return (
        <div className="my-6 inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-line bg-surface min-w-[360px] max-w-full">
          <div className="w-9 h-9 rounded-lg bg-accent-soft flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-accent-deep" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <EditableText
              value={label || fileName}
              onChange={(v) => update({ label: v, fileName: v })}
              placeholder="Download label (e.g. Fundraising template.pdf)"
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: 'var(--nz-ink)',
              }}
              inheritFont={false}
            />
            <EditableText
              value={description}
              onChange={(v) => update({ description: v })}
              placeholder="Optional description..."
              style={{ fontSize: '11.5px', color: 'var(--nz-ink-muted)' }}
              inheritFont={false}
            />
            <EditableText
              value={fileUrl}
              onChange={(v) => update({ fileUrl: v, url: v })}
              placeholder="File URL (https://...)"
              style={{ fontSize: '11px', color: 'var(--nz-ink-faint)' }}
              inheritFont={false}
            />
          </div>
        </div>
      )
    }

    case 'image': {
      const url = (block.content.url as string) || ''
      const alt = (block.content.alt as string) || ''
      const caption = (block.content.caption as string) || ''

      const handleFile = async (file: File) => {
        const fd = new FormData()
        fd.append('file', file)
        try {
          const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
          if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            alert(err.error || 'Upload failed')
            return
          }
          const data = await res.json()
          if (data.url) update({ url: data.url })
        } catch {
          alert('Upload failed')
        }
      }

      return (
        <figure className="my-5 space-y-3">
          {url ? (
            <div className="relative">
              <img
                src={url}
                alt={alt}
                className="w-full rounded-lg border border-line-soft"
              />
              <button
                type="button"
                onClick={() => update({ url: '' })}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center hover:bg-surface-muted cursor-pointer"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5 text-ink-muted" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <label className="block aspect-[16/9] rounded-lg border border-dashed border-line bg-surface-muted/60 flex items-center justify-center cursor-pointer hover:bg-surface-muted transition-colors">
              <div className="text-center">
                <p className="text-[13px] font-medium text-ink-soft">
                  Click to upload an image
                </p>
                <p className="text-[11px] text-ink-muted mt-1">
                  PNG, JPG, GIF, WebP, or SVG — up to 50MB
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
            </label>
          )}
          <EditableText
            value={url}
            onChange={(v) => update({ url: v })}
            placeholder="Or paste an image URL (https://...)"
            style={{ fontSize: '12px', color: 'var(--nz-ink-muted)' }}
            inheritFont={false}
          />
          <EditableText
            value={alt}
            onChange={(v) => update({ alt: v })}
            placeholder="Alt text (for accessibility)"
            style={{ fontSize: '12px', color: 'var(--nz-ink-muted)' }}
            inheritFont={false}
          />
          <EditableText
            value={caption}
            onChange={(v) => update({ caption: v })}
            placeholder="Optional caption (shown under the image)"
            style={{
              fontSize: '12.5px',
              color: 'var(--nz-ink-soft)',
              fontStyle: 'italic',
              textAlign: 'center',
            }}
            inheritFont={false}
          />
        </figure>
      )
    }

    case 'video': {
      const url = (block.content.url as string) || ''
      return (
        <div className="my-5 space-y-3">
          <EditableText
            value={url}
            onChange={(v) => update({ url: v })}
            placeholder="Video URL (YouTube, Vimeo, Loom, or MP4)"
            style={{ fontSize: '13px', color: 'var(--nz-ink-soft)' }}
            inheritFont={false}
          />
          {url ? (
            <div className="rounded-xl overflow-hidden border border-line bg-surface pointer-events-none">
              <VideoEmbed url={url} />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-surface-muted aspect-video flex items-center justify-center">
              <p className="text-[13px] text-ink-faint">
                Paste a video URL above to preview
              </p>
            </div>
          )}
        </div>
      )
    }

    case 'structured_prompt': {
      const label = (block.content.label as string) || ''
      const fields =
        (block.content.fields as Array<{
          key: string
          label: string
          prefix?: string
          suffix?: string
        }>) || []

      const setField = (i: number, patch: Partial<(typeof fields)[number]>) =>
        update({
          fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
        })
      const addField = () =>
        update({
          fields: [
            ...fields,
            { key: `field_${fields.length + 1}`, label: '', prefix: '', suffix: '' },
          ],
        })
      const removeField = (i: number) =>
        update({ fields: fields.filter((_, idx) => idx !== i) })

      return (
        <DoBlockShell
          labelValue={label}
          onLabelChange={(v) => update({ label: v })}
        >
          <div className="space-y-2">
            {fields.map((field, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-surface/60"
              >
                <div className="w-2/5 shrink-0 space-y-1">
                  <EditableText
                    value={field.label}
                    onChange={(v) => setField(i, { label: v })}
                    placeholder="Field label"
                    style={{ fontSize: '13px', color: 'var(--nz-ink-soft)' }}
                    inheritFont={false}
                  />
                  <EditableText
                    value={field.key}
                    onChange={(v) => setField(i, { key: v })}
                    placeholder="storage key"
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--nz-ink-faint)',
                    }}
                    inheritFont={false}
                  />
                </div>
                <div className="flex-1 flex items-center gap-1 bg-surface border border-line rounded-lg px-2 py-1">
                  <EditableText
                    value={field.prefix || ''}
                    onChange={(v) => setField(i, { prefix: v })}
                    placeholder="$"
                    className="w-10 shrink-0"
                    style={{ fontSize: '13px', color: 'var(--nz-ink-faint)' }}
                    inheritFont={false}
                  />
                  <span className="flex-1 text-[13px] text-ink-faint italic px-2">
                    student input
                  </span>
                  <EditableText
                    value={field.suffix || ''}
                    onChange={(v) => setField(i, { suffix: v })}
                    placeholder="/mo"
                    className="w-12 shrink-0"
                    style={{ fontSize: '13px', color: 'var(--nz-ink-faint)' }}
                    inheritFont={false}
                  />
                </div>
                <SmallButton
                  onClick={() => removeField(i)}
                  tone="danger"
                  title="Remove field"
                >
                  <X className="w-3 h-3" strokeWidth={2} />
                </SmallButton>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <AddButton onClick={addField} label="Add field" />
          </div>
        </DoBlockShell>
      )
    }

    case 'fillable_table': {
      const label = (block.content.label as string) || ''
      const columns = (block.content.columns as string[]) || []
      const rows =
        (block.content.rows as Array<{
          cells: Array<{
            value: string
            editable: boolean
            prefix?: string
            suffix?: string
            placeholder?: string
          }>
        }>) || []

      const colCount = columns.length || rows[0]?.cells.length || 2

      const setColumn = (i: number, v: string) =>
        update({ columns: columns.map((c, idx) => (idx === i ? v : c)) })
      const addColumn = () =>
        update({
          columns: [...columns, ''],
          rows: rows.map((r) => ({
            cells: [...r.cells, { value: '', editable: true }],
          })),
        })
      const removeColumn = (i: number) =>
        update({
          columns: columns.filter((_, idx) => idx !== i),
          rows: rows.map((r) => ({
            cells: r.cells.filter((_, idx) => idx !== i),
          })),
        })

      const setCell = (
        ri: number,
        ci: number,
        patch: Partial<(typeof rows)[number]['cells'][number]>,
      ) =>
        update({
          rows: rows.map((row, i) =>
            i === ri
              ? {
                  cells: row.cells.map((cell, j) =>
                    j === ci ? { ...cell, ...patch } : cell,
                  ),
                }
              : row,
          ),
        })
      const addRow = () =>
        update({
          rows: [
            ...rows,
            {
              cells: Array.from({ length: colCount }, () => ({
                value: '',
                editable: true,
              })),
            },
          ],
        })
      const removeRow = (i: number) =>
        update({ rows: rows.filter((_, idx) => idx !== i) })

      return (
        <DoBlockShell
          labelValue={label}
          onLabelChange={(v) => update({ label: v })}
        >
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table
              className="w-full text-[13px]"
              style={{ borderCollapse: 'separate', borderSpacing: 0 }}
            >
              <thead>
                <tr className="bg-surface-muted">
                  {columns.map((col, ci) => (
                    <th
                      key={ci}
                      className="px-3 py-2 text-left border-b border-line border-r border-line-soft last:border-r-0"
                    >
                      <div className="flex items-center gap-1">
                        <EditableText
                          value={col}
                          onChange={(v) => setColumn(ci, v)}
                          placeholder="Column"
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.18em',
                            color: 'var(--nz-ink-muted)',
                          }}
                          inheritFont={false}
                        />
                        {columns.length > 1 && (
                          <SmallButton
                            onClick={() => removeColumn(ci)}
                            tone="danger"
                            title="Remove column"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                          </SmallButton>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="border-b border-line-soft last:border-0"
                  >
                    {row.cells.map((cell, ci) => (
                      <td
                        key={ci}
                        className="px-2 py-1.5 border-r border-line-soft last:border-r-0 align-top"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setCell(ri, ci, { editable: !cell.editable })
                              }
                              className={`shrink-0 w-4 h-4 rounded border text-[8px] font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                cell.editable
                                  ? 'bg-accent text-ink-inverted border-accent'
                                  : 'bg-surface text-ink-muted border-line'
                              }`}
                              title={
                                cell.editable
                                  ? 'Editable (student fills in). Click to lock as static.'
                                  : 'Static (students see the value you enter). Click to make editable.'
                              }
                            >
                              {cell.editable ? 'E' : 'S'}
                            </button>
                            <EditableText
                              value={cell.value}
                              onChange={(v) => setCell(ri, ci, { value: v })}
                              placeholder={cell.editable ? 'Placeholder…' : 'Static text'}
                              style={{
                                fontSize: '13px',
                                color: cell.editable
                                  ? 'var(--nz-ink-faint)'
                                  : 'var(--nz-ink)',
                                fontStyle: cell.editable ? 'italic' : 'normal',
                              }}
                              inheritFont={false}
                            />
                          </div>
                          {cell.editable && (
                            <div className="flex items-center gap-1">
                              <EditableText
                                value={cell.prefix || ''}
                                onChange={(v) =>
                                  setCell(ri, ci, { prefix: v })
                                }
                                placeholder="prefix"
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--nz-ink-faint)',
                                }}
                                inheritFont={false}
                              />
                              <EditableText
                                value={cell.suffix || ''}
                                onChange={(v) =>
                                  setCell(ri, ci, { suffix: v })
                                }
                                placeholder="suffix"
                                style={{
                                  fontSize: '11px',
                                  color: 'var(--nz-ink-faint)',
                                }}
                                inheritFont={false}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="pl-1 w-0 align-middle">
                      <SmallButton
                        onClick={() => removeRow(ri)}
                        tone="danger"
                        title="Remove row"
                      >
                        <X className="w-3 h-3" strokeWidth={2} />
                      </SmallButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <AddButton onClick={addRow} label="Add row" />
            <AddButton onClick={addColumn} label="Add column" />
          </div>
          <p className="mt-2 text-[10.5px] uppercase tracking-[0.2em] text-ink-faint">
            Toggle <span className="font-mono">E/S</span> per cell — <b>E</b>ditable cells let students fill in; <b>S</b>tatic cells show your value.
          </p>
        </DoBlockShell>
      )
    }

    default:
      return (
        <div className="my-4 p-4 rounded-lg border border-line bg-surface-muted text-[13px] text-ink-muted">
          Unknown block type: {(block as ContentBlock).type}
        </div>
      )
  }
}
