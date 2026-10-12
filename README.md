![YAYTV — Yet Another YouTube Tags Viewer](assets/banner.svg)

A minimal Chrome extension that shows the tags/keywords a creator attached to a YouTube video, injected straight into the watch page below the description.

```
Tags            cats, dogs, viral videos, ...
```

## Install

YAYTV is not on the Chrome Web Store, so it has to be loaded as an unpacked extension. It works in Chrome, Edge, Brave and other Chromium-based browsers.

1. On the repository page, click **Code** → **Download ZIP**. This downloads `yaytv-extension-main.zip`.
2. Move the ZIP to a permanent location, e.g. `Documents\Extensions\`. The browser loads the extension from this folder every time it starts, so don't keep it somewhere you clean out, like Downloads.
3. Extract the ZIP. On Windows, right-click it → **Extract All…** → **Extract**. On macOS, double-click it. On Linux, run `unzip yaytv-extension-main.zip`.
4. Type `chrome://extensions` into the address bar and press Enter (`edge://extensions` in Edge, `brave://extensions` in Brave).
5. Turn on **Developer mode**. In Chrome and Brave the toggle is at the top right; in Edge it is in the left sidebar.
6. Click **Load unpacked**.
7. Select the `yaytv-extension-main` folder that directly contains `manifest.json` and click **Select Folder**.
8. Check that the extension card named **YAYTV - Yet Another YouTube Tags Viewer** appears in the list, switched on.
9. Open any video on `youtube.com`. The **Tags** row appears under the description.

## Use

- The row renders itself. There is nothing to click to open it.
- Tags are plain text, not links, so they can be selected and copied without triggering a navigation.
- "The video has no tags" means the creator genuinely did not set any.

Works on `youtube.com/watch` pages, including in-app navigation (clicking a video from the home page, going back, autoplaying the next video). Shorts are not covered.

## How it works

The content script watches for the watch page's metadata to render, then fetches `/watch?v=<id>` and reads the `"keywords":[...]` array that YouTube embeds in the page HTML. The row is inserted after `#bottom-row` inside `ytd-watch-metadata` and styled with YouTube's own CSS variables, so it follows the site's light/dark theme. Successful lookups are cached per video id for the life of the tab. Failures are not cached, so revisiting the video retries.

## License

YAYTV - Yet Another YouTube Tags Viewer\
Copyright (C) 2026 Charalampos Avgerinos

Released under the MIT License. See [LICENSE.txt](LICENSE.txt) for the full text.
