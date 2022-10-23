# next-navigation-history

Navigation History Plugin for Next.js

[![npm version](https://badge.fury.io/js/vue-history-state.svg)](https://badge.fury.io/js/vue-history-state)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

This plugin is usefull for restoring state when users press "Back", "Foward", "Reload".

## Features

- Restore a last state when going forward or back.
- Restore a state when reloading.
- Restore a last state when going forward or back after reloading.

## Supported Vuersion

- Next.js v12 or above

## Install

Using npm:

```
npm install next-navigation-history
```

## Setup

```jsx:_app.jsx
import type { AppProps } from 'next/app'
import { withNavigationHistory } from 'next-navigation-history'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default withNavigationHistory(MyApp, {
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

If you want to access backup data, you have to use a useNavigationHistory.

```javascript
import { useNavigationHistory } from 'next-navigation-history'

const SamplePage: NextPage = () => {
  const [value, setValue] = useState(0)

  // If you just want to get a navigationHistory
  const navigationHistory = useNavigationHistory()

  // If you want to backup and restore state
  const navigationHistory = useNavigationHistory(() => {
    // Backup state
    return { value }
  })

  // navigationHistory is not accessible on the server side
  useEffect(() => {
    if (navigationHistory.state) {
    // Restore state
      setValue(navigationHistory.state.value)
    }
  }, [])
}


```

## API

### NavigationHistory

#### type

A navigation type.

- navigate: When a new page is navigated.
- reload: When a page is reloaded.
- push: When a history.push is called.
- back: When a back navigation is occurred.
- forward: When a forward navigation is occurred.

This method cannot be used on the server.

#### page: number

A current page number (an integer beginning with 0).

This method cannot be used on the server.

#### state: object?

A backup state.

If you want to clear the backup state, you set undefined to this property.

This method always returns undefined on the server.

#### length: number

A history length.

This method cannot be used on the server.

#### getItem(page): HistoryItem?

You can get a location and data of the specified page number.

If you set 'overrideScrollRestoration' option to true, the item has scrollPositions property.

This method cannot use on the server.

#### getItems(): HistoryItem[]

You can get a list of item.

This method cannot be used on the server.

#### findBackPage(location): number?

You can get a page number of the first matched history, 
searching backward in the continuous same site starting at the current page.
If a history item is not found or is not in the continuous same site, this method will return undefined.

If the partial option sets true, it matches any subset of the location.

This method cannot be used on the server.

```javascript
const page = navigationHistory.findBackPage({
    path: '/test'
    // hash: ...
    // query: ...
    // partial: true (default: false)
})
if (page != null) {
    navigationHistory.getItem(page).data = undefined

    // go back to the page in site.
    const router = useRouter()
    router.go(page - navigationHistory.page)
}
```

### HistoryItem

#### location: { path?, query?, hash? }

A location of this saved page.

#### state: object?

A backup state.

If you want to clear the backup state, you set undefined to this property.

#### scrollPositions: object

A saved scroll positions. A root window is obtained with 'window' key, the others by the selector.

## License

[MIT License](./LICENSE)

Copyright (c) Hidekatsu Izuno (hidekatsu.izuno@gmail.com)

