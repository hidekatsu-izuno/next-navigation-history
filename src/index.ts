import { AppProps } from 'next/app'
import { NextRouter, useRouter } from 'next/router'
import { useEffect, useRef, useMemo } from 'react'
import { NavigationHistory, NavigationHistoryOptions, HistoryLocationRaw, HistoryLocation, HistoryItem, NavigationType, NavigationHistoryInternal } from './navigation_history'
import { ClientNavigationHistory } from './navigation_history.client'
import { ServerNavigationHistory } from './navigation_history.server'

export {
  NavigationHistory,
  NavigationHistoryOptions,
  HistoryLocationRaw,
  HistoryLocation,
  HistoryItem,
  NavigationType
}

let navigationHistory: NavigationHistoryInternal

export function withNavigationHistory(app: (props: AppProps) => JSX.Element, options: NavigationHistoryOptions = {}): (props: AppProps) => JSX.Element {
  if (typeof window !== "undefined") {
    navigationHistory = new ClientNavigationHistory(options)
  } else {
    navigationHistory = new ServerNavigationHistory(options)
  }
  return app
}

/**
 * @deprecated use useNavigationRouter
 */
export function useNavigationHistory(): NavigationHistory;
export function useNavigationHistory<T extends Record<string, any>>(
  backup?: () => T
): NavigationHistory {
  if (backup) {
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
        throw new Error('navigationHistory is not initialized.')
      }
      instance._onBackup(() => {
        const backupState = state.current || {}
        if (instance.options.debug) {
          console.log(`backup: state=${JSON.stringify(backupState)}`)
        }
        return backupState
      })
    }, [])
  }

  return navigationHistory
}

export function useNavigationRouter<T extends Record<string, any>>(
  backup?: () => T
): NavigationRouter<T> {
  const router = useRouter()
  const navigationRouter = useMemo(() => {
    return  new NavigationRouter<T>(router)
  }, [router])

  if (backup) {
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
        throw new Error('navigationHistory is not initialized.')
      }
      instance._onBackup(() => {
        const backupState = state.current || {}
        if (instance.options.debug) {
          console.log(`backup: state=${JSON.stringify(backupState)}`)
        }
        return backupState
      })
    }, [])
  }

  return navigationRouter
}

export class NavigationRouter<T=any> {
  constructor(
    private router: NextRouter
  ) {
  }

  get type(): NavigationType {
    return navigationHistory.type
  }

  get state(): T | undefined {
    return navigationHistory.state as T
  }

  set state(value: T | undefined) {
    navigationHistory.state = value
  }

  get info(): any | undefined {
    return navigationHistory.info
  }

  get canGoBack() {
    return navigationHistory.canGoBack
  }

  get canGoForward() {
    return navigationHistory.canGoForward
  }

  get length(): number {
    return navigationHistory.length
  }

  getItem(page: number) {
    return navigationHistory.getItem(page)
  }

  getItems() {
    return navigationHistory.getItems()
  }

  findBackPage(location: HistoryLocationRaw) {
    return navigationHistory.findBackPage(location)
  }

  push(url: string, info?: any) {
    if (info !== undefined) {
      navigationHistory._setNextInfo('push', info)
    }
    this.router.push(url)
  }

  reload(info?: any) {
    if (info !== undefined) {
      navigationHistory._setNextInfo('reload', info)
    }
    window.location.reload()
  }

  back(info?: any) {
    if (info !== undefined) {
      navigationHistory._setNextInfo('back', info)
    }
    window.history.back()
  }

  forward(info?: any)  {
    if (info !== undefined) {
      navigationHistory._setNextInfo('forward', info)
    }
    window.history.forward()
  }

  goToPage(page: number, info?: any) {
    if (!navigationHistory._canGoToPage(page)) {
      throw new RangeError(`The page is out of range: ${page}`)
    }

    if (page < navigationHistory.page) {
      if (info !== undefined) {
        navigationHistory._setNextInfo('back', info)
      }
      window.history.go(page - navigationHistory.page)
    } else if (page > navigationHistory.page) {
      if (info !== undefined) {
        navigationHistory._setNextInfo('forward', info)
      }
      window.history.go(page - navigationHistory.page)
    }
  }
}
