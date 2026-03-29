'use client'

import { useEffect, useRef } from 'react'

interface PetalData {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  rotation: number
  rotSpeed: number
  wobble: number
  wobbleSpeed: number
  wobbleAmp: number
  color: { r: number; g: number; b: number }
  opacity: number
  scale: number
}

const PETAL_COLORS = [
  { r: 242, g: 184, b: 198 },
  { r: 250, g: 212, b: 223 },
  { r: 212, g: 134, b: 156 },
  { r: 255, g: 200, b: 210 },
]

export function SakuraPetals({ count = 25 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const petalsRef = useRef<PetalData[]>([])
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function createPetal(init: boolean): PetalData {
      const c = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]
      return {
        x: Math.random() * canvas!.width,
        y: init ? Math.random() * canvas!.height : -20 - Math.random() * 100,
        size: Math.random() * 8 + 5,
        speedY: Math.random() * 0.8 + 0.3,
        speedX: Math.random() * 0.6 - 0.3,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
        wobbleAmp: Math.random() * 1.5 + 0.5,
        color: c,
        opacity: Math.random() * 0.4 + 0.15,
        scale: Math.random() * 0.5 + 0.5,
      }
    }

    petalsRef.current = Array.from({ length: count }, () => createPetal(true))

    function update(p: PetalData) {
      p.y += p.speedY
      p.wobble += p.wobbleSpeed
      p.x += p.speedX + Math.sin(p.wobble) * p.wobbleAmp * 0.3
      p.rotation += p.rotSpeed
      if (p.y > canvas!.height + 20) {
        Object.assign(p, createPetal(false))
      }
      if (p.x > canvas!.width + 20) p.x = -20
      if (p.x < -20) p.x = canvas!.width + 20
    }

    function draw(p: PetalData) {
      ctx!.save()
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rotation)
      ctx!.scale(p.scale, p.scale)
      ctx!.globalAlpha = p.opacity

      // Draw petal shape with bezier curves
      ctx!.beginPath()
      ctx!.moveTo(0, -p.size)
      ctx!.bezierCurveTo(
        p.size * 0.8, -p.size * 0.5,
        p.size * 0.6, p.size * 0.3,
        0, p.size
      )
      ctx!.bezierCurveTo(
        -p.size * 0.6, p.size * 0.3,
        -p.size * 0.8, -p.size * 0.5,
        0, -p.size
      )
      ctx!.fillStyle = `rgb(${p.color.r},${p.color.g},${p.color.b})`
      ctx!.fill()

      // Add subtle vein line
      ctx!.beginPath()
      ctx!.moveTo(0, -p.size * 0.7)
      ctx!.quadraticCurveTo(p.size * 0.1, 0, 0, p.size * 0.7)
      ctx!.strokeStyle = `rgba(${p.color.r - 20},${p.color.g - 20},${p.color.b - 20},0.3)`
      ctx!.lineWidth = 0.5
      ctx!.stroke()

      ctx!.restore()
    }

    function animate() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      petalsRef.current.forEach((p) => {
        update(p)
        draw(p)
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{ transition: 'opacity 0.3s ease' }}
    />
  )
}
