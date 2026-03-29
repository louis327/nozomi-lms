'use client'

type VideoEmbedProps = {
  url: string
}

function extractVideoInfo(url: string): { provider: 'youtube' | 'vimeo' | null; id: string | null } {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (ytMatch) return { provider: 'youtube', id: ytMatch[1] }

  // Vimeo
  const vimeoMatch = url.match(
    /(?:vimeo\.com\/(?:video\/)?)(\d+)/
  )
  if (vimeoMatch) return { provider: 'vimeo', id: vimeoMatch[1] }

  return { provider: null, id: null }
}

export function VideoEmbed({ url }: VideoEmbedProps) {
  const { provider, id } = extractVideoInfo(url)

  if (!provider || !id) {
    return (
      <div className="aspect-video bg-nz-bg-tertiary rounded-2xl flex items-center justify-center">
        <p className="text-nz-text-muted text-sm">Invalid video URL</p>
      </div>
    )
  }

  const embedUrl =
    provider === 'youtube'
      ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`
      : `https://player.vimeo.com/video/${id}?byline=0&portrait=0`

  return (
    <div className="aspect-video bg-nz-bg-primary rounded-2xl overflow-hidden border border-nz-border">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Video lesson"
      />
    </div>
  )
}
