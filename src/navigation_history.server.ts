import { NavigationType, HistoryItem, HistoryLocationRaw, NavigationHistory } from "./navigation_history"

export class ServerNavigationHistory<T=Record<string, any> | undefined> implements NavigationHistory<T> {
  constructor(
    public options: Record<string, any> = {}
  ) {
  }

  get type(): NavigationType {
    throw new Error('type is not supported on server.')
  }

  get page(): number {
    throw new Error('page is not supported on server.')
  }

  get state(): T {
    throw new Error('data is not supported on server.')
  }

  set state(value: T) {
    // no handle
  }

  get length(): number {
    throw new Error('length is not supported on server.')
  }

  getItem(page: number): HistoryItem | undefined {
    throw new Error('getItem is not supported on server.')
  }

  getItems(): Array<HistoryItem> {
    throw new Error('getItems is not supported on server.')
  }

  findBackPage(location: HistoryLocationRaw): number | undefined {
    throw new Error('findBackPosition is not supported on server.')
  }

  push(url: string, info?: any) {
    throw new Error('navigate is not supported on server.')
  }

  reload(info?: any) {
    throw new Error('reload is not supported on server.')
  }

  get canGoBack(): boolean {
    throw new Error('canGoBack is not supported on server.')
  }

  back(info?: any) {
    throw new Error('back is not supported on server.')
  }

  get canGoForward(): boolean {
    throw new Error('canGoForward is not supported on server.')
  }

  forward(info?: any)  {
    throw new Error('forward is not supported on server.')
  }

  goToPage(page: number, info?: any) {
    throw new Error('goToPage is not supported on server.')
  }
}
