import { AppProps } from 'next/app'
import { useEffect, useRef } from 'react'
import { HistoryState as NavigationHistory, HistoryStateOptions } from './navigation_history'
import { ClientHistoryState as ClientNavigationHistory } from './navigation_history.client'
import { ServerHistoryState as ServerNavigationHistory } from './navigation_history.server'

export * from './navigation_history'

let navigationHistory: NavigationHistory

export function withHistoryState(app: (props: AppProps) => JSX.Element, options: HistoryStateOptions = {}): (props: AppProps) => JSX.Element {
  if (typeof window !== "undefined") {
    navigationHistory = new ClientNavigationHistory(options)
  } else {
    navigationHistory = new ServerNavigationHistory(options)
  }

  return app
}

export function useNavigationHistory(): NavigationHistory;
export function useNavigationHistory<T=Record<string, any>>(
  backup: () => T,
  restore: (event: ResotreEvent<T>) => void,
): NavigationHistory;
export function useNavigationHistory<T=Record<string, any>>(
  backup?: () => T,
  restore?: (event: ResotreEvent<T>) => void,
): NavigationHistory {
  if (!backup || !restore) {
    return navigationHistory
  }

  const flag = useRef(false)
  const state = useRef<T>()
  state.current = backup()

  useEffect(() => {
    if (typeof window === "undefined" || flag.current) {
      return
    }
    flag.current = true

    const instance = navigationHistory as ClientNavigationHistory
    if (!instance) {
      throw new Error('historyState is not initialized.')
    }
    if (instance.type === 'reload' || instance.type === 'back' || instance.type === 'forward') {
      const restoreState = { type: instance.type, state: instance.state as T }
      if (instance.options.debug) {
        console.log(`restore: type=${restoreState.type} state=${restoreState.state}`)
      }
      restore(restoreState)
    }

    instance._callback = () => {
      const backupState = state.current || {}
      if (instance.options.debug) {
        console.log(`backup: state=${JSON.stringify(backupState)}`)
      }
      return backupState
    }
  }, [])

  return navigationHistory
}

export declare type ResotreEvent<T=Record<string, any>> = {
  type: "reload" | "back" | "forward"
  state: T
}
