'use client'

import { createContext, useContext } from 'react'

type TourContextValue = {
  restart: () => Promise<void>
  completed: boolean
}

export const TourContext = createContext<TourContextValue>({
  restart: async () => {},
  completed: true,
})

export function useTour() {
  return useContext(TourContext)
}
