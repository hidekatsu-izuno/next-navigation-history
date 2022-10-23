# next-history-state

History State Plugin for Next.js

[![npm version](https://badge.fury.io/js/vue-history-state.svg)](https://badge.fury.io/js/vue-history-state)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Vue History State Plugin is usefull for restoring state when users press "Back" or "Foward".

## Features

- Restore a last state when going forward or back.
- Restore a state when reloading.
- Restore a last state when going forward or back after reloading.

## Supported Vuersion

- Next.js v12 or above

## Install

Using npm:

```
npm install next-history-state
```

## Setup

```jsx:_app.jsx
import type { AppProps } from 'next/app'
import { withHistoryState } from 'next-history-state'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default withHistoryState(MyApp, {
  ...
})
```

### Options

#### maxHistoryLength

Sets the maximum length of hisotries that can hold data.

When this option is not set, it depends on a max history length of a browser.

*Default:* undefined

#### overrideScrollRestoration

Indicates whether this plugin override a default scroll restoration of the browser.

If you set this option to true, it manages a scroll restoration by using own saved position.

*Default:* true

#### scrollingElements

Indicates to which element the overrode behavior is applied.

If you set this option to a selecter, it applies the scrolling to the selector, in addition to the window.

*Default:* undefined

## Usage

If you want to access backup data, you have to define a useHistoryState.

```javascript
import { useHistoryState, onBackupState } from 'vue-history-state'

// If you just want to get a historyState
const historyState = useHistoryState()

// If you want to backup and restore data
const historyState = useHistoryState(
  // Backup data 
  () => ({
    key: value
  }),

  // Restore data 
  ({ action, data }) => {
    setValue(data.key)
  }
)
```

## API

### HistoryState

#### action

A action type that caused a navigation.

- navigate: When a new page is navigated.
- reload: When a page is reloaded.
- push: When a history.push is called.
- back: When a back navigation is occurred.
- forward: When a forward navigation is occurred.

This method cannot be used on server.

#### page: number

A current page number (an integer beginning with 0).

This method cannot be used on server.

#### length: number

A history length.

This method cannot be used on server.

#### getItem(page): HistoryItem?

You can get a location and data of the specified page number.

If you set 'overrideScrollRestoration' option to true, the item has scrollPositions property.

This method cannot use on server.

#### getItems(): HistoryItem[]

You can get a list of item.

This method cannot be used on server.

#### findBackPage(location): number?

You can get a page number of the first matched history, 
searching backward in the continuous same site starting at the current page.
If a history state is not found or is not in the continuous same site, this method will return undefined.

If the partial option sets true, it matches any subset of the location.

This method cannot be used on server.

```javascript
const page = historyState.findBackPage({
    path: '/test'
    // hash: ...
    // query: ...
    // partial: true (default: false)
})
if (page != null) {
    historyState.getItem(page).data = undefined

    // go back to the page in site.
    const router = useRouter()
    router.go(page - historyState.page)
}
```

### HistoryItem

#### location: { path?, query?, hash? }

A location of this saved page.

#### data: object?

A backup data.

If you want to clear the backup data, you set undefined to this property.

#### scrollPositions: object

A saved scroll positions. A root window is obtained with 'window' key, the others by the selector.

## License

[MIT License](./LICENSE)

Copyright (c) Hidekatsu Izuno (hidekatsu.izuno@gmail.com)

