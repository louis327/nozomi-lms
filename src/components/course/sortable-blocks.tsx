'use client'

import { useCallback, useState, type ReactNode } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type DragHandleProps = {
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  setActivatorNodeRef: (el: HTMLElement | null) => void
  isDragging: boolean
}

type SortableBlockWrapperProps = {
  id: string
  children: (handle: DragHandleProps) => ReactNode
  showTopIndicator?: boolean
  showBottomIndicator?: boolean
}

export function SortableBlockWrapper({
  id,
  children,
  showTopIndicator,
  showBottomIndicator,
}: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {showTopIndicator && (
        <div
          className="absolute left-0 right-0 -top-px h-0.5 bg-accent rounded-full pointer-events-none z-20"
          aria-hidden
        />
      )}
      {children({
        attributes: attributes as unknown as Record<string, unknown>,
        listeners: listeners as unknown as Record<string, unknown> | undefined,
        setActivatorNodeRef,
        isDragging,
      })}
      {showBottomIndicator && (
        <div
          className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent rounded-full pointer-events-none z-20"
          aria-hidden
        />
      )}
    </div>
  )
}

type SortableBlocksContainerProps = {
  blockIds: string[]
  onReorder: (oldIndex: number, newIndex: number) => void
  children: (state: {
    activeId: string | null
    overId: string | null
    insertAfterId: string | null
  }) => ReactNode
}

export function SortableBlocksContainer({
  blockIds,
  onReorder,
  children,
}: SortableBlocksContainerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveId(String(e.active.id))
  }, [])

  const handleDragOver = useCallback((e: DragOverEvent) => {
    setOverId(e.over ? String(e.over.id) : null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      setOverId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = blockIds.indexOf(active.id as string)
      const newIndex = blockIds.indexOf(over.id as string)
      if (oldIndex !== -1 && newIndex !== -1) onReorder(oldIndex, newIndex)
    },
    [blockIds, onReorder],
  )

  // Compute the id of the block AFTER which the drop will land (null = top)
  let insertAfterId: string | null = null
  if (activeId && overId && activeId !== overId) {
    const activeIdx = blockIds.indexOf(activeId)
    const overIdx = blockIds.indexOf(overId)
    if (overIdx > activeIdx) {
      insertAfterId = overId
    } else if (overIdx < activeIdx) {
      insertAfterId = overIdx === 0 ? null : blockIds[overIdx - 1] ?? null
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null)
        setOverId(null)
      }}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        {children({ activeId, overId, insertAfterId })}
      </SortableContext>
    </DndContext>
  )
}
