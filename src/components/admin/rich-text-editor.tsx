'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Check,
  X,
} from 'lucide-react'
import { SlashMenu, type SlashItem } from '@/components/admin/slash-menu'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  onSlashSelect?: (item: SlashItem) => void
}

export function RichTextEditor({ content, onChange, placeholder = 'Start writing...', onSlashSelect }: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashRect, setSlashRect] = useState<{ top: number; left: number; bottom: number } | null>(null)
  const [slashFrom, setSlashFrom] = useState<number | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TiptapLink.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-accent underline underline-offset-2' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
      if (!onSlashSelect) return
      // Detect a slash query: "/" or "/word" at the cursor, preceded by start-of-block or whitespace
      const { from } = ed.state.selection
      const $from = ed.state.doc.resolve(from)
      const blockStart = $from.start($from.depth)
      const before = ed.state.doc.textBetween(blockStart, from, '\n', '\n')
      const match = before.match(/(?:^|\s)\/(\w*)$/)
      if (match) {
        const triggerLen = match[0].startsWith('/') ? match[0].length : match[0].length - 1
        const triggerStart = from - triggerLen + (match[0].startsWith('/') ? 0 : 1)
        setSlashFrom(triggerStart)
        setSlashQuery(match[1])
        setSlashOpen(true)
        const coords = ed.view.coordsAtPos(from)
        setSlashRect({ top: coords.top, left: coords.left, bottom: coords.bottom })
      } else {
        setSlashOpen(false)
        setSlashFrom(null)
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose-nozomi focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  })

  useEffect(() => {
    if (!slashOpen) return
    const close = () => setSlashOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [slashOpen])

  const handleSlashSelect = (item: SlashItem) => {
    if (!editor || slashFrom === null) return
    const to = editor.state.selection.from
    editor.chain().focus().deleteRange({ from: slashFrom, to }).run()
    setSlashOpen(false)
    setSlashFrom(null)
    onSlashSelect?.(item)
  }

  if (!editor) return null

  const toggleLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    setLinkUrl('')
    setShowLinkInput(true)
  }

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }

  const cancelLink = () => {
    setShowLinkInput(false)
    setLinkUrl('')
    editor.chain().focus().run()
  }

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void
    active?: boolean
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
        active
          ? 'bg-accent/15 text-accent'
          : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="rounded-xl bg-surface border border-line overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-line-soft bg-surface-muted/40 flex-wrap">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-line mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-line mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-line mx-1" />
        <ToolbarButton onClick={toggleLink} active={editor.isActive('link')}>
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <div className="w-px h-5 bg-line mx-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line-soft bg-surface-muted/50">
          <LinkIcon className="w-3.5 h-3.5 text-ink-muted shrink-0" />
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyLink()
              if (e.key === 'Escape') cancelLink()
            }}
            placeholder="https://example.com"
            autoFocus
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="p-1 rounded-md text-success hover:bg-success/10 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={cancelLink}
            className="p-1 rounded-md text-ink-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />

      {slashOpen && (
        <SlashMenu
          rect={slashRect}
          query={slashQuery}
          onSelect={handleSlashSelect}
          onClose={() => setSlashOpen(false)}
        />
      )}
    </div>
  )
}
