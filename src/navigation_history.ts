export declare type NavigationType = "navigate" | "push" | "reload" | "back" | "forward"

export interface NavigationHistory<T=Record<string, any> | undefined> {
  options: Record<string, any>

  get type(): NavigationType

  get page(): number

  get state(): T

  set state(value: T)

  get length(): number

  getItem(page: number): HistoryItem | undefined

  getItems(): Array<HistoryItem>

  findBackPage(location: HistoryLocationRaw): number | undefined

  push(url: string, info?: any): void

  reload(url: string, info?: any): void

  get canGoBack(): boolean

  back(info?: any): void

  get canGoForward(): boolean

  forward(info?: any): void

  goToPage(page: number, info?: any): void
}

export declare type NavigationHistoryOptions = {
  maxHistoryLength?: number
  overrideScrollRestoration?: boolean
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

  get state(): Record<string, any> | undefined

  set state(value: Record<string, any> | undefined)

  get scrollPositions(): Record<string, { left: number, top: number }> | undefined
}
