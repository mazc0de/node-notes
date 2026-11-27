import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useToast } from '../components/Toast'
import { useAuth } from '../auth/AuthProvider'
import { deleteItem, fetchCollections, fetchItems, fetchTags, restoreItem, setPinned } from './api'
import { itemTitle, truncate } from './display'
import type { ItemSummary } from './types'

export const keys = {
  items: ['items'] as const,
  collections: ['collections'] as const,
  tags: ['tags'] as const,
  note: (id: string) => ['note', id] as const,
  search: (q: string) => ['search', q] as const,
}

export function useItems() {
  const { session } = useAuth()
  return useQuery({ queryKey: keys.items, queryFn: fetchItems, enabled: Boolean(session) })
}

export function useCollections() {
  const { session } = useAuth()
  return useQuery({ queryKey: keys.collections, queryFn: fetchCollections, enabled: Boolean(session) })
}

export function useTags() {
  const { session } = useAuth()
  return useQuery({ queryKey: keys.tags, queryFn: fetchTags, enabled: Boolean(session) })
}

export function useRefreshLibrary() {
  const qc = useQueryClient()
  return useCallback(
    () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: keys.items }),
        qc.invalidateQueries({ queryKey: keys.tags }),
        qc.invalidateQueries({ queryKey: keys.collections }),
      ]),
    [qc],
  )
}

export function useTogglePin() {
  const qc = useQueryClient()
  const { toast } = useToast()
  return useCallback(
    async (item: Pick<ItemSummary, 'id' | 'pinned'>) => {
      const next = !item.pinned
      qc.setQueryData<ItemSummary[]>(keys.items, (list) =>
        list?.map((i) => (i.id === item.id ? { ...i, pinned: next } : i)),
      )
      try {
        await setPinned(item.id, next)
      } catch {
        toast({ message: "Couldn't update the pin. Try again." })
        void qc.invalidateQueries({ queryKey: keys.items })
      }
    },
    [qc, toast],
  )
}

/** Delete right away; offer Undo in a toast for ~5 seconds. */
export function useDeleteItem() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const refresh = useRefreshLibrary()

  return useCallback(
    async (item: Pick<ItemSummary, 'id' | 'kind' | 'title' | 'url' | 'excerpt'>) => {
      const previous = qc.getQueryData<ItemSummary[]>(keys.items)
      qc.setQueryData<ItemSummary[]>(keys.items, (list) => list?.filter((i) => i.id !== item.id))
      try {
        const snapshot = await deleteItem(item.id)
        qc.removeQueries({ queryKey: keys.note(item.id) })
        toast({
          message: `Deleted “${truncate(itemTitle(item))}”`,
          actionLabel: 'Undo',
          onAction: async () => {
            try {
              await restoreItem(snapshot)
            } catch {
              toast({ message: "Couldn't restore it." })
            } finally {
              void refresh()
            }
          },
        })
        return true
      } catch {
        qc.setQueryData(keys.items, previous)
        toast({ message: "Couldn't delete. Try again." })
        return false
      }
    },
    [qc, toast, refresh],
  )
}
