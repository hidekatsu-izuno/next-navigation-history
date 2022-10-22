export declare type ActionType = "navigate" | "push" | "reload" | "back" | "forward"

export interface HistoryState {
  options: Record<string, any>

  get action(): ActionType

  get page(): number

  get length(): number

  getItem(page: number): HistoryItem | undefined

  getItems(): Array<HistoryItem>

  findBackPage(location: HistoryLocationRaw): number | undefined
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
