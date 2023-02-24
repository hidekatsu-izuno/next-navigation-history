import { NextRouter, useRouter } from 'next/router.js'
import { useRef } from 'react'
import { GlobalNavigationHistory, NavigationHistoryOptions, HistoryLocationRaw, HistoryLocation, HistoryItem, NavigationType } from './navigation_history.js'
import { ClientNavigationHistory } from './navigation_history.client.js'
import { ServerNavigationHistory } from './navigation_history.server.js'

export {
  NavigationHistoryOptions,
  HistoryLocationRaw,
  HistoryLocation,
  HistoryItem,
  NavigationType
}

let globalNavigationHistory: GlobalNavigationHistory

export function withNavigationHistory(
  app: (...args: any[]) => JSX.Element,
  options: NavigationHistoryOptions = {}
): (...args: any[]) => JSX.Element {
  if (typeof window !== "undefined") {
    globalNavigationHistory = new ClientNavigationHistory(options)
  } else {
    globalNavigationHistory = new ServerNavigationHistory(options)
  }
  return app
}

export function useNavigationHistory<T=any>(
  backup?: () => T
): NavigationHistory<T> {
  if (backup) {
    const flag = useRef(false)
    if (typeof window !== "undefined" && !flag.current) {
      flag.current = true

      const instance = globalNavigationHistory
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
    }

    const state = useRef<T>()
    state.current = backup()
  }

  const instance = useRef(new NavigationHistory<T>())
  instance.current._router = useRouter()
  return instance.current
}

export class NavigationHistory<T=any> {
  /** @internal */
  _router?: NextRouter

  get type(): NavigationType {
    return globalNavigationHistory.type
  }

  get visited(): boolean {
    return globalNavigationHistory.type === 'back' ||
      globalNavigationHistory.type === 'forward' ||
      globalNavigationHistory.type === 'reload'
  }

  get state(): T | undefined {
    return globalNavigationHistory.state as T
  }

  set state(value: T | undefined) {
    globalNavigationHistory.state = value
  }

  get info(): any | undefined {
    return globalNavigationHistory.info
  }

  get canGoBack() {
    return globalNavigationHistory.canGoBack
  }

  get canGoForward() {
    return globalNavigationHistory.canGoForward
  }

  get length(): number {
    return globalNavigationHistory.length
  }

  getItem(page: number) {
    return globalNavigationHistory.getItem(page)
  }

  getItems() {
    return globalNavigationHistory.getItems()
  }

  findBackPage(location: HistoryLocationRaw) {
    return globalNavigationHistory.findBackPage(location)
  }

  findForwardPage(location: HistoryLocationRaw) {
    return globalNavigationHistory.findForwardPage(location)
  }

  push(url: string, info?: any) {
    if (info !== undefined) {
      globalNavigationHistory._setNextInfo('push', info)
    }
    this._router?.push(url)
  }

  reload(info?: any) {
    if (info !== undefined) {
      globalNavigationHistory._setNextInfo('reload', info)
    }
    window.location.reload()
  }

  back(info?: any) {
    if (info !== undefined) {
      globalNavigationHistory._setNextInfo('back', info)
    }
    this._router?.back()
  }

  forward(info?: any)  {
    if (info !== undefined) {
      globalNavigationHistory._setNextInfo('forward', info)
    }
    const forward = (this._router as any).forward
    if (forward) {
      return forward()
    } else {
      window.history.forward()
    }
  }

  goToPage(page: number, info?: any) {
    if (!globalNavigationHistory._canGoToPage(page)) {
      throw new RangeError(`The page is out of range: ${page}`)
    }

    if (page < globalNavigationHistory.page) {
      if (info !== undefined) {
        globalNavigationHistory._setNextInfo('back', info)
      }
      window.history.go(page - globalNavigationHistory.page)
    } else if (page > globalNavigationHistory.page) {
      if (info !== undefined) {
        globalNavigationHistory._setNextInfo('forward', info)
      }
      window.history.go(page - globalNavigationHistory.page)
    }
  }

  prefetch(href: string) {
    return this._router?.prefetch(href)
  }

  refresh() {
    const refresh = (this._router as any).refresh
    if (refresh) {
      refresh()
    }
  }
}
