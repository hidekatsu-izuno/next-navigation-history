import { NextConfig } from 'next'
import { useEffect, useRef } from 'react'
import { HistoryState, HistoryStateOptions } from './history_state'
import { ClientHistoryState } from './history_state.client'

let historyStateInstance = new HistoryState()

export function NextHistoryState(options: HistoryStateOptions = {}) {
  if (typeof window !== 'undefined') {
    historyStateInstance = new ClientHistoryState(options)
  }

  return function withHistoryState(config: NextConfig) {
    return config
  }
}

export function useHistoryState<T extends Record<string, unknown>>(
  restore: (data: T) => void,
  backup: () => T
) {
  const flag = useRef(false);
  const data = useRef({})
  data.current = backup()

  useEffect(() => {
    if (typeof window === "undefined" || flag.current) {
      return
    }
    flag.current = true

    const instance = historyStateInstance as ClientHistoryState
    if (!instance) {
      throw new Error('historyStateInstance is not initialized.')
    }
    if (instance.options.debug) {
      console.log(`restore: action=${instance.action} data=${JSON.stringify(instance.data)}`)
    }
    if (instance.action === 'back' || instance.action === 'forward' || instance.action === 'reload') {
      restore(instance.data as T)
    }

    instance._register(() => {
      if (instance.options.debug) {
        console.log(`backup: data=${JSON.stringify(data.current)}`)
      }
      return data.current
    })
  }, [])

  return historyStateInstance
}
