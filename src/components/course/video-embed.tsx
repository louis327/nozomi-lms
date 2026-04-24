'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'

type VideoEmbedProps = {
  url: string
}

type ProviderInfo =
  | { provider: 'youtube'; id: string }
  | { provider: 'vimeo'; id: string }
  | { provider: 'loom'; id: string }
  | { provider: 'mp4'; id: null }
  | { provider: null; id: null }

function extractVideoInfo(url: string): ProviderInfo {
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  )
  if (yt) return { provider: 'youtube', id: yt[1] }

  const vm = url.match(/(?:vimeo\.com\/(?:video\/)?)(\d+)/)
  if (vm) return { provider: 'vimeo', id: vm[1] }

  const loom = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/)
  if (loom) return { provider: 'loom', id: loom[1] }

  if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { provider: 'mp4', id: null }

  return { provider: null, id: null }
}

function youtubePoster(id: string): string {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
}

function PlayOverlay({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-0 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors group"
      aria-label="Play video"
    >
      <span className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-transform group-hover:scale-110"
            style={{ background: 'var(--nz-accent)' }}>
        <Play className="w-7 h-7 text-white ml-1" strokeWidth={2} fill="currentColor" />
      </span>
    </button>
  )
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const info = extractVideoInfo(url)
  const [playing, setPlaying] = useState(false)

  if (!info.provider) {
    return (
      <div className="aspect-video bg-surface-muted rounded-xl flex items-center justify-center">
        <p className="text-ink-muted text-sm">Invalid video URL</p>
      </div>
    )
  }

  if (info.provider === 'mp4') {
    return (
      <div className="aspect-video bg-black rounded-xl overflow-hidden">
        <video src={url} controls className="w-full h-full" preload="metadata" />
      </div>
    )
  }

  if (!playing) {
    const poster =
      info.provider === 'youtube' ? youtubePoster(info.id) : null

    return (
      <div className="aspect-video bg-black rounded-xl overflow-hidden relative">
        {poster ? (
          <img src={poster} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'var(--nz-ink)' }} />
        )}
        <PlayOverlay onClick={() => setPlaying(true)} />
      </div>
    )
  }

  let embedUrl: string
  if (info.provider === 'youtube') {
    embedUrl = `https://www.youtube.com/embed/${info.id}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&playsinline=1`
  } else if (info.provider === 'vimeo') {
    embedUrl = `https://player.vimeo.com/video/${info.id}?autoplay=1&byline=0&portrait=0&title=0`
  } else {
    embedUrl = `https://www.loom.com/embed/${info.id}?autoplay=1&hide_owner=true&hide_share=true&hide_title=true`
  }

  return (
    <div className="aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="Video lesson"
      />
    </div>
  )
}
