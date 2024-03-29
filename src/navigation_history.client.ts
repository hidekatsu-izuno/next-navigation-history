import LZString from 'lz-string'
import { Router } from 'next/router.js'
import { NavigationHistoryOptions, GlobalNavigationHistory, HistoryLocation, HistoryLocationRaw, HistoryItem, NavigationType } from './navigation_history.js'
import { isObjectEqual, isObjectMatch } from './utils/functions.js'

export class ClientNavigationHistory implements GlobalNavigationHistory {
  private _type: NavigationType = 'navigate'
  private _page = 0
  private _items = new Array<[
    ('navigate' | 'push')?,
    (HistoryLocation)?,
    any?,
    (Record<string, { left: number, top: number }>)?,
  ]>([])
  private _route?: HistoryLocation
  private _nextInfo?: NextInfo
  private _info?: any
  private _callback?: () => Record<string, any>

  constructor(
    public options: NavigationHistoryOptions = {}
  ) {
    if (process.env.__NEXT_SCROLL_RESTORATION) {
      options.overrideScrollRestoration = false
    } else if (options.overrideScrollRestoration == null) {
      options.overrideScrollRestoration = true
    }

    if (this.options.overrideScrollRestoration) {
      if (window.history.scrollRestoration) {
        window.history.scrollRestoration = "manual"
      }
    }

    try {
      const navType = getNavigationType()
      if (window.sessionStorage) {
        const backupText = sessionStorage.getItem('next-navigation-history')
        if (backupText) {
          sessionStorage.removeItem('next-navigation-history')
          try {
            const backupState = JSON.parse(LZString.decompressFromUTF16(backupText) || '[]')
            this._page = backupState[0]
            this._items = backupState[1]
            this._nextInfo = backupState[2]
            if (navType === 'navigate') {
              this._type = 'navigate'
              this._page = this._page + 1
            } else {
              this._type = 'reload'
            }
          } catch (error) {
            console.error('Failed to restore from sessionStorage.', error)
          }
        } else if (navType === 'reload') {
          console.error('The saved state is not found.')
        }

        const isMozilla = '-moz-user-select' in document.documentElement.style
        window.addEventListener(isMozilla ? 'beforeunload' : 'unload', event => {
          this._save('unload')

          try {
            const backupState = []
            backupState.push(this._page)
            backupState.push(this._items)
            if (this._nextInfo) {
              backupState.push(this._nextInfo)
            }
            sessionStorage.setItem('next-navigation-history', LZString.compressToUTF16(JSON.stringify(backupState)))
          } catch (error) {
            console.error('Failed to save to sessionStorage.', error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to access to sessionStorage.', error)
    }

    if (getNavigationType() === 'back_forward') {
      // back or forward from other site
      this._enter('constructor', `${location.pathname || ''}${location.search || ''}${location.hash || ''}`, window.history.state.page)
    } else {
      // navigate or reloaded
      this._enter('constructor', `${location.pathname || ''}${location.search || ''}${location.hash || ''}`, this._page)
    }

    // back, forward
    Router.events.on('beforeHistoryChange', (url, { shallow }) => {
      if (this._page !== window.history.state?.page) {
        this._save('beforeHistoryChange')
        this._enter('beforeHistoryChange', url, window.history.state.page)
      }
    })

    // push
    const orgPushState = window.history.pushState
    window.history.pushState = (state, ...args) => {
      this._save('pushState')

      state.page = this._page + 1
      const ret = orgPushState.apply(window.history, [state, ...args])

      this._type = 'push'
      this._page = state.page

      this._enter('pushState', `${location.pathname || ''}${location.search || ''}${location.hash || ''}`, this.page)

      return ret
    }

    const orgReplaceState = window.history.replaceState
    window.history.replaceState = (state, ...args) => {
      if (state.page == null) {
        state.page = window.history.state?.page || this._page
      }

      const ret = orgReplaceState.apply(window.history, [state, ...args])

      if (this.options.debug) {
        console.log(`replaceState: page=${this._page} stote.page=${state?.page}`)
      }

      return ret
    }

    if (this.options.overrideScrollRestoration) {
      window.addEventListener('load', () => this._loaded('load'))
      Router.events.on('routeChangeComplete', () => this._loaded('routeChangeComplete'))
    }
  }

  get type(): NavigationType {
    return this._type
  }

  get page(): number {
    return this._page
  }

  get state(): any | undefined {
    const item = this._items[this._page]
    return (item && item[2]) || undefined
  }

  set state(value: any | undefined) {
    const item = this._items[this._page]
    if (item) {
      item[2] = value ?? null
    }
  }

  get info(): any | undefined {
    return this._info
  }

  get canGoBack() {
    return this._page - 1 >= 0
  }

  get canGoForward() {
    return this._page + 1 < this._items.length
  }

  get length(): number {
    return this._items.length
  }

  getItem(page: number): HistoryItem | undefined {
    if (page >= this._items.length) {
      return undefined
    }

    const item = this._items[page]
    return new HistoryItemImpl(item)
  }

  getItems(): Array<HistoryItem> {
    const items = []
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i]
      items.push(new HistoryItemImpl(item))
    }
    return items
  }

  findBackPage(location: HistoryLocationRaw): number | undefined {
    const partial = typeof location === 'object' && location.partial

    const type = this._items[this._page][0]
    if (type !== 'navigate') {
      const normalized = filterRoute(location)
      for (let p = this._page - 1; p >= 0; p--) {
        const backLocation = this._items[p][1]
        if (backLocation) {
          if (partial) {
            if (isMatchedRoute(backLocation, normalized)) {
              return p
            }
          } else {
            if (isSameRoute(backLocation, normalized)) {
              return p
            }
          }
        }

        const backType = this._items[p][0]
        if (backType === 'navigate') {
          break
        }
      }
    }
    return undefined
  }

  findForwardPage(location: HistoryLocationRaw): number | undefined {
    const partial = typeof location === 'object' && location.partial

    const normalized = filterRoute(location)
    for (let p = this._page + 1; p < this._items.length; p++) {
      const forwardType = this._items[p][0]
      if (forwardType === 'navigate') {
        break
      }

      const fowardLocation = this._items[p][1]
      if (fowardLocation) {
        if (partial) {
          if (isMatchedRoute(fowardLocation, normalized)) {
            return p
          }
        } else {
          if (isSameRoute(fowardLocation, normalized)) {
            return p
          }
        }
      }
    }
    return undefined
  }

  /** @internal */
  _canGoToPage(page: number) {
    if (page < 0 && page >= this._items.length) {
      return false
    }

    if (page < this._page) {
      for (let p = this._page; p >= page; p--) {
        const type = this._items[p][0]
        if (type === 'navigate') {
          return false
        }
      }
    } else if (page > this._page) {
      for (let p = this._page + 1; p < page; p++) {
        const type = this._items[p][0]
        if (type === 'navigate') {
          return false
        }
      }
    }

    return true
  }

  /** @internal */
  _setNextInfo(type: string, info: any) {
    if (info === undefined) {
      return
    }

    let page = this._page
    if (type === 'push' || type === 'forward') {
      page = page + 1
    } else if (type === 'back') {
      page = page - 1
    }

    this._nextInfo = { page, type, info }
  }

  /** @internal */
  _onBackup(callback: () => Record<string, any>) {
    this._callback = callback
  }

  private _enter(event: string, url: string, page: number) {
    this._route = filterRoute(url)
    this._info = undefined

    if (page != null && page !== this._page) {
      if (page < this._page) {
        this._type = 'back'
      } else if (page > this._page) {
        this._type = 'forward'
      }
      this._page = page
    } else if (this._type === 'reload' && getNavigationType() === 'back_forward') {
      if (page != null && page >= this._page) {
        this._type = 'forward'
      } else {
        this._type = 'back'
      }
      if (page != null) {
        this._page = page
      }
    }

    if (this._page > this._items.length) {
      this._page = this._items.length
    }

    if (this._type === 'navigate' || this._type === 'push') {
      this._items.length = this._page + 1
      this._items[this._page] = []
    } else if (!this._items[this._page]) {
      this._items[this._page] = []
    }

    if (this._nextInfo && this._nextInfo.page === this._page && this._nextInfo.type === this._type) {
      this._info = this._nextInfo.info
    }
    this._nextInfo = undefined

    if (this.options.debug) {
      this._debug('_enter', event)
    }
  }

  private async _loaded(event: string) {
    if (this.options.overrideScrollRestoration &&
      (this.type === 'reload' || this.type === 'back' || this.type === 'forward')) {

      const positions = this._items[this._page]?.[3]
      const targets = []
      if (positions) {
        if (this.options.scrollingElements) {
          let scrollingElements = this.options.scrollingElements
          if (!Array.isArray(scrollingElements)) {
            scrollingElements = [scrollingElements]
          }

          for (const selector of scrollingElements) {
            const elem = document.querySelector(selector)
            const position = positions?.[selector]
            if (elem && position) {
              targets.push({ elem, position })
            }
          }
        }
        if (positions.window) {
          targets.push({ elem: window, position: positions.window })
        }
      } else {
        targets.push({ elem: window, position: { left: 0, top: 0} })
      }

      for (let i = 0; i < 10; i++) {
        if (i > 0) {
          // wait 10ms * 10 = 100ms
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        for (const target of targets) {
          target.elem.scrollTo(target.position.left, target.position.top)
        }
      }
    }

    if (this.options.debug) {
      this._debug('_loaded', event)
    }
  }

  private _save(event: string) {
    if (this._type === 'navigate') {
      this._items[this._page][0] = 'navigate'
    } else if (this._type === 'push') {
      this._items[this._page][0] = 'push'
    }

    this._items[this._page][1] = this._route

    if (this._callback != null) {
      this._items[this._page][2] = this._callback()
      this._callback = undefined
    }

    if (this.options.overrideScrollRestoration) {
      const positions: Record<string, { left: number, top: number }> = {}
      if (this.options.scrollingElements) {
        let scrollingElements = this.options.scrollingElements
        if (!Array.isArray(scrollingElements)) {
          scrollingElements = [scrollingElements]
        }
        for (const selector of scrollingElements) {
          const elem = document.querySelector(selector)
          if (elem) {
            positions[selector] = { left: elem.scrollLeft, top: elem.scrollTop }
          }
        }
      }
      positions['window'] = { left: window.pageXOffset, top: window.pageYOffset }
      this._items[this._page][3] = positions
    }

    const maxPage = Math.min(this.options.maxHistoryLength || window.history.length, window.history.length)
    if (this._items.length > maxPage) {
      for (let page = 0; page < this._items.length - maxPage; page++) {
        this._items[page] = []
      }
    }

    if (this.options.debug) {
      this._debug('_save', event)
    }
  }

  private _debug(marker: string, event: string) {
    console.log(`[${marker}] page: ${this._page}, type: ${JSON.stringify(this._type)}, event: ${event}\n` +
      this._items.reduce((prev1: unknown, current1: Array<unknown>, index) => {
        return `${prev1}  items[${index}] ` + (current1.length > 0
          ? `type: ${JSON.stringify(current1[0])}, route: ${JSON.stringify(current1[1])}, data: ${JSON.stringify(current1[2])}, scrollPositions: ${JSON.stringify(current1[3])}\n`
          : '\n')
      }, '')
    )
  }
}

class HistoryItemImpl implements HistoryItem {
  constructor(
    private item: [
      ('navigate' | 'push')?,
      (HistoryLocation)?,
      (Record<string, any> | null)?,
      (Record<string, { left: number, top: number }>)?,
    ]
  ) {
  }

  get location(): HistoryLocation {
    return this.item[1] || {}
  }

  get state(): Record<string, any> | undefined {
    return this.item[2] ?? undefined
  }

  set state(value: Record<string, any> | undefined) {
    this.item[2] = value ?? null
  }

  get scrollPositions(): Record<string, { left: number, top: number }> {
    return this.item[3] || {}
  }
}

function getNavigationType() {
  if (window.performance) {
    const nav = window.performance.getEntriesByType &&
      window.performance.getEntriesByType('navigation')
    if (nav && nav.length) {
      return (nav[0] as PerformanceNavigationTiming).type
    } else if (window.performance.navigation) {
      switch (window.performance.navigation.type) {
        case 0: return 'navigate'
        case 1: return 'reload'
        case 2: return 'back_forward'
        default: return 'prerender'
      }
    }
  }
  return 'navigate'
}

declare type NextInfo = {
  page: number,
  type: string,
  info: any,
}

function parseFullPath(path: string) {
  let hash = undefined
  let query = undefined

  const hashIndex = path.indexOf('#')
  if (hashIndex >= 0) {
    hash = path.slice(hashIndex)
    path = path.slice(0, hashIndex)
  }

  const qparamsIndex = path.indexOf('?')
  if (qparamsIndex >= 0) {
    query = parseQuery(path.slice(qparamsIndex + 1))
    path = path.slice(0, qparamsIndex)
  }

  return {
    path,
    hash,
    query
  }
}

function parseQuery(qparams?: string): Record<string, string[] | string | null> | undefined {
  qparams = qparams && qparams.replace(/^(\?|#|&)/, '')
  if (!qparams) {
    return undefined
  }

  const result: Record<string, string[] | string | null> = {}
  qparams.split('&').forEach(qparam => {
    const qparamIndex = qparam.indexOf('=')
    let qname = qparam
    let qvalue = ''
    if (qparamIndex >= 0) {
      qname = decodeURIComponent(qparam.slice(0, qparamIndex))
      qvalue = decodeURIComponent(qparam.slice(qparamIndex + 1))
    }

    const prevQvalue = result[qname]
    if (!prevQvalue) {
      result[qname] = qvalue
    } else if (Array.isArray(prevQvalue)) {
      prevQvalue.push(qvalue)
    } else {
      result[qname] = [prevQvalue, qvalue]
    }
  })
  return result
}

function filterRoute(route: HistoryLocationRaw): HistoryLocation {
  if (typeof route === 'string') {
    const parsed = parseFullPath(route)
    route = { pathname: parsed.path }
    if (parsed.hash) {
      route.hash = parsed.hash
    }
    if (parsed.query) {
      route.query = parsed.query
    }
  }

  const filtered: HistoryLocation = {}
  if (route.pathname != null && route.pathname.length > 0) {
    filtered.pathname = route.pathname
  }

  if (route.query) {
    const query: Record<string, string | string[]> = {}
    for (const key in route.query) {
      const param = route.query[key]
      if (Array.isArray(param)) {
        const nparams = new Array<string>()
        for (let i = 0; i < param.length; i++) {
          const nparam = param[i]
          if (nparam === null) {
            nparams.push('')
          } else if (nparam != undefined) {
            nparams.push(nparam.toString())
          }
        }
        query[key] = nparams
      } else if (param === null) {
        query[key] = ''
      } else if (param != undefined) {
        query[key] = param.toString()
      }
    }

    if (Object.keys(query).length > 0) {
      filtered.query = query
    }
  }

  if (route.hash) {
    filtered.hash = route.hash
  }

  return filtered
}

const trailingSlashRE = /\/?$/

function isMatchedRoute(a: HistoryLocation, b?: HistoryLocation) {
  if (!b) {
    return false
  } else if (a.pathname && b.pathname) {
    return (
      a.pathname.replace(trailingSlashRE, '') === b.pathname.replace(trailingSlashRE, '') &&
      (b.hash == null || a.hash === b.hash) &&
      isObjectMatch(a.query, b.query)
    )
  }
  return false
}

function isSameRoute(a: HistoryLocation, b?: HistoryLocation) {
  if (!b) {
    return false
  } else if (a.pathname && b.pathname) {
    return (
      a.pathname.replace(trailingSlashRE, '') === b.pathname.replace(trailingSlashRE, '') &&
      a.hash === b.hash &&
      isObjectEqual(a.query, b.query)
    )
  }
  return false
}
