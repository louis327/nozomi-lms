type CourseThumbProps = {
  title: string
  coverImage?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: { box: 'w-10 h-10 rounded-md', text: 'text-[13px]' },
  md: { box: 'w-14 h-14 rounded-lg', text: 'text-[17px]' },
  lg: { box: 'w-20 h-20 rounded-xl', text: 'text-[24px]' },
  xl: { box: 'w-32 h-32 rounded-2xl', text: 'text-[40px]' },
} as const

// Deterministic pastel tone from title — gives each course a unique but calm colour
function toneFromTitle(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  const tones = [
    { bg: 'bg-[#F3E8EE]', text: 'text-[#8A1538]' },
    { bg: 'bg-[#EDE7F6]', text: 'text-[#4527A0]' },
    { bg: 'bg-[#E8F0FE]', text: 'text-[#1A44A8]' },
    { bg: 'bg-[#E6F4EA]', text: 'text-[#1E6B3A]' },
    { bg: 'bg-[#FFF4E5]', text: 'text-[#8B4A00]' },
    { bg: 'bg-[#FEE7E2]', text: 'text-[#9A2A1B]' },
    { bg: 'bg-[#E0F2F1]', text: 'text-[#00655B]' },
    { bg: 'bg-[#F1F3F4]', text: 'text-[#3C4043]' },
  ]
  return tones[Math.abs(hash) % tones.length]
}

export function CourseThumb({ title, coverImage, size = 'md', className = '' }: CourseThumbProps) {
  const { box, text } = sizeMap[size]
  const initial = title.trim().charAt(0).toUpperCase() || 'N'
  const tone = toneFromTitle(title)

  if (coverImage) {
    return (
      <div className={`${box} overflow-hidden bg-surface-muted shrink-0 ${className}`}>
        <img src={coverImage} alt="" className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`${box} ${tone.bg} flex items-center justify-center shrink-0 ${className}`}>
      <span className={`font-serif ${text} ${tone.text}`}>{initial}</span>
    </div>
  )
}
