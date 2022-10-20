import { HistoryItem, HistoryLocationRaw } from './index'

export class HistoryState {
  public options: Record<string, any> = {}

  get action(): string {
    return 'navigate';
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

  clearItemData(page: number): Record<string, any> | undefined {
    throw new Error('clearItemData is not supported on server.')
  }

  findBackPage(location: HistoryLocationRaw): number | undefined {
    throw new Error('findBackPosition is not supported on server.')
  }
}
