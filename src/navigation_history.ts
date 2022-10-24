export declare type NavigationType = "navigate" | "push" | "reload" | "back" | "forward"

export interface NavigationHistory {
  options: Record<string, any>

  get type(): NavigationType

  get page(): number

  get state(): Record<string, any> | undefined

  set state(value: Record<string, any> | undefined)

  get info(): any | undefined

  get canGoBack(): boolean

  get canGoForward(): boolean

  canGoToPage(page: number): boolean

  setNextInfo(type: string, info: any): void

  onBackup(callback: () => Record<string, any>): void

  get length(): number

  getItem(page: number): HistoryItem | undefined

  getItems(): Array<HistoryItem>

  findBackPage(location: HistoryLocationRaw): number | undefined
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
