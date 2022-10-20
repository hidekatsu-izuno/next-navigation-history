import LZString from 'lz-string'
import { Router } from 'next/router'
import { HistoryStateOptions, HistoryState, HistoryLocation, HistoryLocationRaw, HistoryItem } from './history_state'
import { isObjectEqual, isObjectMatch } from './utils/functions'

export class ClientHistoryState extends HistoryState {
  private _action = 'navigate'
  private _page = 0
  private _items = new Array<[
    ('navigate' | 'push')?,
    (HistoryLocation)?,
    (Record<string, any> | null)?,
    (Record<string, { left: number, top: number }>)?,
  ]>([])
  private _dataFuncs = new Array<() => Record<string, unknown>>()
  private _route?: HistoryLocation = undefined
  private _popState = false

  constructor(
    options: HistoryStateOptions
  ) {
    super(options)

/*
    if (Router.options.scrollBehavior) {
      options.overrideDefaultScrollBehavior = false;
    } else if (options.overrideDefaultScrollBehavior == null) {
      options.overrideDefaultScrollBehavior = true;
    }
*/
    try {
      const navType = getNavigationType()
      if (window.sessionStorage) {
        const backupText = sessionStorage.getItem('vue-history-state')
        if (backupText) {
          sessionStorage.removeItem('vue-history-state')
          try {
            const backupState = JSON.parse(LZString.decompressFromUTF16(backupText) || '[]')
            this._page = backupState[0]
            this._items = backupState[1]
            if (navType === 'navigate') {
              this._action = 'navigate'
              this._page = this._page + 1
            } else {
              this._action = 'reload'
            }
          } catch (error) {
            console.error('Failed to restore from sessionStorage.', error)
          }
        } else if (navType === 'reload') {
          console.error('The saved history state is not found.')
        }

        window.addEventListener('unload', event => {
          this._save()

          try {
            sessionStorage.setItem('vue-history-state', LZString.compressToUTF16(JSON.stringify([
              this._page,
              this._items
            ])))
          } catch (error) {
            console.error('Failed to save to sessionStorage.', error)
          }

          if (this.options.debug) {
            this._debug('unload')
          }
        })
      }
    } catch (error) {
      console.error('Failed to access to sessionStorage.', error)
    }

    if (getNavigationType() === 'back_forward') {
      // back or forward from other site
      this._enter(`${location.pathname || ''}${location.search || ''}${location.hash || ''}`, window.history.state.page)
    } else {
      // navigate or reloaded
      this._enter(`${location.pathname || ''}${location.search || ''}${location.hash || ''}`, this._page)
    }

    // back or forwared from same site
    window.addEventListener('popstate', event => {
      this._popState = true

      if (this.options.debug) {
        console.log(`popstate: page=${event.state?.page}`)
      }
    })

    // back, forward
    Router.events.on('beforeHistoryChange', (url, { shallow }) => {
      if (this._popState) {
        this._save()
        this._enter(url, window.history.state.page)
        this._popState = false
      }

      if (this.options.debug) {
        console.log(`beforeHistoryChange: url=${url}`)
      }
    })

    // push
    const orgPushState = window.history.pushState
    window.history.pushState = (state, ...args) => {
      this._save()

      state.page = this._page + 1
      const ret = orgPushState.apply(window.history, [state, ...args])

      this._action = 'push'
      this._page = state.page

      this._enter(`${location.pathname || ''}${location.search || ''}${location.hash || ''}`, this.page)

      if (this.options.debug) {
        console.log(`pushState: page=${state.page}`)
      }

      return ret
    }

    const orgReplaceState = window.history.replaceState
    window.history.replaceState = (state, ...args) => {
      if (state.page == null) {
        state.page = window.history.state?.page || this._page
      }

      const ret = orgReplaceState.apply(window.history, [state, ...args])

      if (this.options.debug) {
        console.log(`replaceState: page=${state.page}`)
      }

      return ret
    }

/*
    if (this.options.overrideDefaultScrollBehavior) {
      Router.options.scrollBehavior = async (to, from) => {
        if (to.hash) {
          return { el: to.hash }
        }

        let positions: Record<string, { left: number, top: number }> | null | undefined = undefined
        if (
          (this._action == 'back' || this._action == 'forward' || this._action == 'reload')
          && this._items[this._page]
          && (positions = this._items[this._page][3])
        ) {

          if (this.options.scrollingElements) {
            let scrollingElements = this.options.scrollingElements
            if (!Array.isArray(scrollingElements)) {
              scrollingElements = [scrollingElements]
            }
            nextTick(async () => {
              for (let i = 0; i < 10; i++) {
                if (i > 0) {
                  // wait 10ms * 10 = 100ms
                  await new Promise(resolve => setTimeout(resolve, 10));
                }

                for (const selector of scrollingElements) {
                  const elem = document.querySelector(selector)
                  const position = positions && positions[selector]
                  if (elem && position) {
                    elem.scrollTo(position.left, position.top)
                  }
                }
              }
            })
          }

          if (positions.window) {
            return positions.window
          }
        }

        return { left: 0, top: 0 }
      }
    }
*/
  }

  private _enter(url: string, page: number) {
    this._route = filterRoute(url)

    if (page != null && page !== this._page) {
      if (page < this._page) {
        this._action = 'back'
      } else if (page > this._page) {
        this._action = 'forward'
      }
      this._page = page
    } else if (this._action === 'reload' && getNavigationType() === 'back_forward') {
      if (page != null && page >= this._page) {
        this._action = 'forward'
      } else {
        this._action = 'back'
      }
      if (page != null) {
        this._page = page
      }
    }

    if (this._page > this._items.length) {
      this._page = this._items.length
    }

    if (this._action === 'navigate' || this._action === 'push') {
      this._items.length = this._page + 1
      this._items[this._page] = []
    } else if (!this._items[this._page]) {
      this._items[this._page] = []
    }

    if (this.options.debug) {
      this._debug('afterRouteChange')
    }
  }

  /** @internal */
  _register(fn: () => Record<string, unknown>) {
    const index = this._dataFuncs.indexOf(fn)
    if (index == -1) {
      this._dataFuncs.push(fn)
    }
    if (this.options.debug) {
      console.log('_register')
    }
  }

  get action(): string {
    return this._action
  }

  get page(): number {
    return this._page
  }

  get data(): Record<string, any> | undefined {
    const item = this._items[this._page]
    return (item && item[2]) || undefined
  }

  set data(value: Record<string, unknown> | undefined) {
    const item = this._items[this._page]
    if (item) {
      item[2] = value ?? null
    }
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

  /**
   * @deprecated Use getItem(page).data = undefined
   */
  clearItemData(page: number): Record<string, any> | undefined {
    const item = this.getItem(page)
    if (item) {
      const data = item.data
      item.data = undefined
      return data
    }
    return undefined
  }

  findBackPage(location: HistoryLocationRaw, partial?: boolean): number | undefined {
    partial = typeof location === 'object' && location.partial

    const action = this._items[this._page][0]
    if (action !== 'navigate') {
      const normalized = filterRoute(location)
      for (let page = this._page - 1; page >= 0; page--) {
        const backLocation = this._items[page][1]
        if (backLocation) {
          if (partial) {
            if (isMatchedRoute(backLocation, normalized)) {
              return page
            }
          } else {
            if (isSameRoute(backLocation, normalized)) {
              return page
            }
          }
        }

        const backAction = this._items[page][0]
        if (backAction === 'navigate') {
          break
        }
      }
    }
    return undefined
  }

  private _save() {
    if (this._action === 'navigate') {
      this._items[this._page][0] = 'navigate'
    } else if (this._action === 'push') {
      this._items[this._page][0] = 'push'
    }

    this._items[this._page][1] = this._route

    if (this._dataFuncs != null) {
      const backupData = this._dataFuncs.reduce((prev, current) => {
        const values = current()
        for (const key in values) {
          if (Object.prototype.hasOwnProperty.call(values, key)) {
            prev[key] = values[key]
          }
        }
        return prev
      }, {} as Record<string, any>)
      this._items[this._page][2] = backupData
      this._dataFuncs.length = 0
    }

    if (this.options.overrideDefaultScrollBehavior) {
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
  }

  private _debug(marker: string) {
    console.log(`[${marker}] page: ${this._page}, action: ${JSON.stringify(this._action)}, route: ${JSON.stringify(this._route)}\n` +
      this._items.reduce((prev1: unknown, current1: Array<unknown>, index) => {
        return `${prev1}  items[${index}] action: ${JSON.stringify(current1[0])}, route: ${JSON.stringify(current1[1])}, data: ${JSON.stringify(current1[2])}, scrollPositions: ${JSON.stringify(current1[3])}\n`
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

  get data(): Record<string, any> | undefined {
    return this.item[2] ?? undefined
  }

  set data(value: Record<string, unknown> | undefined) {
    this.item[2] = value ?? null
  }

  get scrollPositions(): Record<string, { left: number, top: number }> {
    return this.item[3] || {}
  }
}

function getNavigationType() {
  if (window.performance) {
    const navi = window.performance.getEntriesByType &&
      window.performance.getEntriesByType('navigation')
    if (navi && navi.length) {
      return (navi[0] as PerformanceNavigationTiming).type
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
