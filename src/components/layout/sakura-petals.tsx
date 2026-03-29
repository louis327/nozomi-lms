'use client'

import { useEffect, useState } from 'react'

type Petal = {
  id: number
  left: number
  size: number
  delay: number
  duration: number
  opacity: number
}

function generatePetals(count: number): Petal[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 20,
    duration: 15 + Math.random() * 20,
    opacity: 0.15 + Math.random() * 0.25,
  }))
}

export function SakuraPetals({ count = 10 }: { count?: number }) {
  const [petals, setPetals] = useState<Petal[]>([])

  useEffect(() => {
    setPetals(generatePetals(Math.min(count, 12)))
  }, [count])

  if (petals.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="absolute rounded-full bg-nz-sakura"
          style={{
            left: `${petal.left}%`,
            top: '-20px',
            width: `${petal.size}px`,
            height: `${petal.size * 0.7}px`,
            opacity: 0,
            animation: `petalFloat ${petal.duration}s ${petal.delay}s infinite ease-in-out`,
            filter: 'blur(0.5px)',
          }}
        />
      ))}
    </div>
  )
}
