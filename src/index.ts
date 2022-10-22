import { useEffect, useRef } from 'react'
import { HistoryState, HistoryStateOptions } from './history_state'
import { ClientHistoryState } from './history_state.client'
import { ServerHistoryState } from './history_state.server'

let historyState: HistoryState

export function setupHistoryState(options: HistoryStateOptions = {}) {
  if (typeof window === "undefined") {
    historyState = new ServerHistoryState(options)
  } else {
    historyState = new ClientHistoryState(options)
  }
}

export function useHistoryState<T>(
  backup: () => T,
  restore: (data: T) => void,
) {
  const flag = useRef(false)
  const data = useRef<T>()
  data.current = backup()

  useEffect(() => {
    if (typeof window === "undefined" || flag.current) {
      return
    }
    flag.current = true

    const instance = historyState as ClientHistoryState
    if (!instance) {
      throw new Error('historyStateInstance is not initialized.')
    }
    if (instance.action === 'back' || instance.action === 'forward' || instance.action === 'reload') {
      const item = instance.getItem(instance.page)
      if (instance.options.debug) {
        console.log(`restore: action=${instance.action} data=${JSON.stringify(item && item.data)}`)
      }
      restore((item && item.data) as T)
    }

    instance._register(() => {
      if (instance.options.debug) {
        console.log(`backup: data=${JSON.stringify(data.current)}`)
      }
      return data.current
    })
  }, [])

  return historyState
}
