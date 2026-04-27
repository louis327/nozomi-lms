export type ImageWidth = 'sm' | 'md' | 'lg' | 'full'
export type ImageAlign = 'left' | 'center' | 'right'

export const IMAGE_WIDTH_CLASS: Record<ImageWidth, string> = {
  sm: 'max-w-[40%]',
  md: 'max-w-[70%]',
  lg: 'max-w-[90%]',
  full: 'max-w-full',
}

export const IMAGE_ALIGN_CLASS: Record<ImageAlign, string> = {
  left: 'mr-auto',
  center: 'mx-auto',
  right: 'ml-auto',
}

export function normalizeImageWidth(v: unknown): ImageWidth {
  return v === 'sm' || v === 'md' || v === 'lg' || v === 'full' ? v : 'md'
}

export function normalizeImageAlign(v: unknown): ImageAlign {
  return v === 'left' || v === 'center' || v === 'right' ? v : 'center'
}

export function imageFigureClass(width: ImageWidth, align: ImageAlign): string {
  return `${IMAGE_WIDTH_CLASS[width]} ${IMAGE_ALIGN_CLASS[align]}`
}
