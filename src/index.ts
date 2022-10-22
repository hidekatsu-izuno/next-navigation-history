import { AppProps } from 'next/app'
import { useEffect, useRef } from 'react'
import { HistoryState, HistoryStateOptions } from './history_state'
import { ClientHistoryState } from './history_state.client'
import { ServerHistoryState } from './history_state.server'

export * from './history_state'

let historyState: HistoryState

export function withHistoryState(app: (props: AppProps) => JSX.Element, options: HistoryStateOptions = {}): (props: AppProps) => JSX.Element {
  if (typeof window !== "undefined") {
    const clientHistoryState = new ClientHistoryState(options)
    historyState = clientHistoryState

    return (props: AppProps) => {
      if (typeof window !== "undefined" && (
        clientHistoryState.action === 'reload' ||
        clientHistoryState.action === 'back' ||
        clientHistoryState.action === 'forward'
      )) {
        useEffect(() => {
          clientHistoryState._restoreScroll()
        }, [])
      }
      return app(props)
    }
  } else {
    historyState = new ServerHistoryState(options)

    return app
  }
}

export function useHistoryState(): HistoryState;
export function useHistoryState<T>(
  backup: () => T,
  restore: (action: "reload" | "back" | "forward", data: T) => void,
): HistoryState;
export function useHistoryState<T=Record<string, any>>(
  backup?: () => T,
  restore?: (action: "reload" | "back" | "forward", data: T) => void,
): HistoryState {
  if (!backup || !restore) {
    return historyState
  }

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
    if (instance.action === 'reload' || instance.action === 'back' || instance.action === 'forward') {
      const item = instance.getItem(instance.page)
      const data = (item && item.data) as T
      if (instance.options.debug) {
        console.log(`restore: action=${instance.action} data=${JSON.stringify(data)}`)
      }
      restore(instance.action, data)
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
