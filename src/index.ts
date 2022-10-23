import { AppProps } from 'next/app'
import { useEffect, useRef } from 'react'
import { HistoryState, HistoryStateOptions } from './history_state'
import { ClientHistoryState } from './history_state.client'
import { ServerHistoryState } from './history_state.server'

export * from './history_state'

let historyState: HistoryState

export function withHistoryState(app: (props: AppProps) => JSX.Element, options: HistoryStateOptions = {}): (props: AppProps) => JSX.Element {
  if (typeof window !== "undefined") {
    historyState = new ClientHistoryState(options)

    return app
  } else {
    historyState = new ServerHistoryState(options)

    return app
  }
}

export function useHistoryState(): HistoryState;
export function useHistoryState<T=Record<string, any>>(
  backup: () => T,
  restore: (event: ResotreEvent<T>) => void,
): HistoryState;
export function useHistoryState<T=Record<string, any>>(
  backup?: () => T,
  restore?: (event: ResotreEvent<T>) => void,
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
      throw new Error('historyState is not initialized.')
    }
    if (instance.action === 'reload' || instance.action === 'back' || instance.action === 'forward') {
      const item = instance.getItem(instance.page)
      const data = (item && item.data) as T
      if (instance.options.debug) {
        console.log(`restore: action=${instance.action} data=${JSON.stringify(data)}`)
      }
      restore({ action: instance.action, data })
    }

    instance._callback = () => {
      const backupData = data.current || {}
      if (instance.options.debug) {
        console.log(`backup: data=${JSON.stringify(backupData)}`)
      }
      return backupData
    }
  }, [])

  return historyState
}

export declare type ResotreEvent<T=Record<string, any>> = {
  action: "reload" | "back" | "forward"
  data: T
}
