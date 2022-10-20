import { NextConfig } from 'next'
import { Router } from 'next/router'
import { useEffect, useRef } from 'react'
import { HistoryState } from './history_state'
import { ClientHistoryState } from './history_state.client'

let historyStateInstance = new HistoryState()

export function NextHistoryState(options: HistoryStateOptions = {}) {
  if (typeof window !== 'undefined') {
    historyStateInstance = new ClientHistoryState(options, Router)
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

export declare type HistoryStateOptions = {
  maxHistoryLength?: number
  overrideDefaultScrollBehavior?: boolean
  scrollingElements?: string | string[]
  debug?: boolean
}

export declare type HistoryLocationRaw = string | {
  pathname?: string
  query?: Record<string, (string | number | null)[] | string | number | null>
  hash?: string
  partial?: boolean
}

export declare type HistoryLocation = {
  pathname?: string
  query?: Record<string, string[] | string>
  hash?: string
}

export interface HistoryItem {
  get location(): HistoryLocation

  get data(): Record<string, any> | undefined

  set data(value: Record<string, any> | undefined)

  get scrollPositions(): Record<string, { left: number, top: number }> | undefined
}
