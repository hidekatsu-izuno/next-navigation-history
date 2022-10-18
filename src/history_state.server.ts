import { HistoryItem, HistoryLocationRaw, HistoryState } from './index'

export class ServerHistoryState implements HistoryState {
  private _action = 'navigate'

  get action(): string {
    return this._action;
  }

  get page(): number {
    return 0
  }

  get data(): Record<string, any> | undefined {
    return undefined
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

  clearItemData(page: number): Record<string, any> {
    throw new Error('clearItemData is not supported on server.')
  }

  findBackPage(location: HistoryLocationRaw): number {
    throw new Error('findBackPosition is not supported on server.')
  }

  private _debug(marker: string) {
    console.log(`[${marker}] _page: ${this.page}, _action: ${JSON.stringify(this._action)}`)
  }
}
