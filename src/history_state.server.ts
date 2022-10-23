import { NavigationType, HistoryItem, HistoryLocationRaw, HistoryState } from "./history_state"

export class ServerHistoryState implements HistoryState {
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
