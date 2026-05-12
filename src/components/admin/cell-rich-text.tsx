'use client'

import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Mark, mergeAttributes } from '@tiptap/core'
import { Bold, Italic, Underline as UnderlineIcon, Type, ImagePlus, Loader2 } from 'lucide-react'

const Small = Mark.create({
  name: 'small',
  parseHTML() {
    return [{ tag: 'small' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['small', mergeAttributes(HTMLAttributes), 0]
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smallMark: {
      toggleSmall: () => ReturnType
    }
  }
}

const SmallWithCommand = Small.extend({
  addCommands() {
    return {
      toggleSmall:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    }
  },
})

function stripSingleParagraph(html: string): string {
  const trimmed = html.trim()
  const m = trimmed.match(/^<p>([\s\S]*)<\/p>$/)
  if (!m) return trimmed
  if (m[1].includes('<p>')) return trimmed
  return m[1]
}

function wrapForEditor(html: string): string {
  const trimmed = (html ?? '').trim()
  if (!trimmed) return ''
  if (/^<(p|h[1-6]|ul|ol|blockquote)\b/i.test(trimmed)) return trimmed
  return `<p>${trimmed}</p>`
}

interface CellRichTextProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  variant?: 'header' | 'body'
}

export function CellRichText({
  value,
  onChange,
  placeholder = '',
  variant = 'body',
}: CellRichTextProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      SmallWithCommand,
      Image.configure({
        // Images render inline in cells; cap them with CSS in globals.
        inline: true,
        allowBase64: false,
        HTMLAttributes: { class: 'nz-cell-image', loading: 'lazy' }
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: wrapForEditor(value),
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      onChange(stripSingleParagraph(html))
    },
    editorProps: {
      attributes: {
        class: `tiptap focus:outline-none ${
          variant === 'header'
            ? 'text-[12.5px] font-semibold text-white'
            : 'text-[14px] text-ink leading-[1.55]'
        }`,
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor) return
    const incoming = wrapForEditor(value)
    const current = editor.getHTML()
    if (stripSingleParagraph(current) !== stripSingleParagraph(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Upload selected file and insert it as an image at the current cursor.
  const uploadAndInsert = async (file: File) => {
    if (!editor || uploading) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Upload failed')
        return
      }
      const data = await res.json()
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url, alt: file.name }).run()
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Allow paste-from-clipboard images too
  useEffect(() => {
    if (!editor) return
    const view = editor.view
    const handler = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            uploadAndInsert(file)
            return
          }
        }
      }
    }
    view.dom.addEventListener('paste', handler as any)
    return () => view.dom.removeEventListener('paste', handler as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  if (!editor) return null

  const ToolbarButton = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void
    active?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        active
          ? 'bg-accent text-white'
          : 'text-ink hover:bg-surface-muted'
      }`}
    >
      {children}
    </button>
  )

  return (
    <>
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top' }}
        className="flex items-center gap-0.5 rounded-lg border border-line bg-surface px-1 py-1 shadow-lg"
      >
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-line mx-0.5" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleSmall().run()}
          active={editor.isActive('small')}
          title="Subtitle (small, muted line)"
        >
          <Type className="w-3.5 h-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-line mx-0.5" />
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          title="Insert image"
        >
          {uploading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <ImagePlus className="w-3.5 h-3.5" />}
        </ToolbarButton>
      </BubbleMenu>
      <EditorContent editor={editor} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadAndInsert(f)
        }}
      />
    </>
  )
}
