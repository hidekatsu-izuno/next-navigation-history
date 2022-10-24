import { NavigationType, HistoryItem, HistoryLocationRaw, NavigationHistory } from "./navigation_history"

export class ServerNavigationHistory implements NavigationHistory {
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

  get state(): Record<string, any> | undefined {
    throw new Error('state is not supported on server.')
  }

  set state(value: Record<string, any> | undefined) {
    throw new Error('state is not supported on server.')
  }

  get info() {
    throw new Error('info is not supported on server.')
  }

  get canGoBack(): boolean {
    throw new Error('canGoBack is not supported on server.')
  }

  get canGoForward(): boolean {
    throw new Error('canGoForward is not supported on server.')
  }

  canGoToPage(): boolean {
    throw new Error('canGoToPage is not supported on server.')
  }

  setNextInfo(type: string, info: any) {
    throw new Error('setNextInfo is not supported on server.')
  }

  onBackup(callback: () => Record<string, any>): void {
    throw new Error('onBackup is not supported on server.')
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
}
