/**
 * Yet Another Tags Viewer — Shows the tags (keywords) of any YouTube video.
 *
 * Injects a row into the video metadata area, right below the description.
 *
 * YouTube is a single-page app: this script loads once and stays loaded, so it
 * reacts to navigation events and DOM changes instead of to page loads. Every
 * trigger funnels into sync(), which is cheap and safe to call repeatedly —
 * start reading there.
 */

/** Sanity-checks ?v= before it reaches a fetch. */
const VIDEO_ID = /^[\w-]{11}$/;

/** Pulls the tag array out of the watch page HTML. Lazy, so it stops at the first `],`. */
const KEYWORDS_IN_HTML = /"keywords":\s*(\[.*?\])\s*,/;

/** Where to hang the row, best placement first — YouTube ships more than one layout. */
const ANCHORS = [
  { selector: 'ytd-watch-metadata #bottom-row', position: 'afterend' },
  { selector: 'ytd-watch-metadata #above-the-fold', position: 'beforeend' },
];

/** videoId -> tags, so re-renders and revisits don't refetch. Lives as long as the tab. */
const tagCache = new Map();

/**
 * Looks up user facing text in _locales/<locale>/messages.json, via the browser's
 * UI language. Falls back to the key itself so a typo is visible, not blank.
 */
function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

/** The video id of the page being viewed, or null when this isn't a watch page. */
function currentVideoId() {
  const url = new URL(location.href);
  if (url.pathname !== '/watch') return null;
  const id = url.searchParams.get('v');
  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * Tags for a video, from cache or from a same-origin fetch of its watch page.
 * Returns [] for a video with no tags, throws if the page couldn't be read —
 * that split is what lets sync() show the right message. Only hits are cached.
 */
async function getTags(videoId) {
  if (tagCache.has(videoId)) return tagCache.get(videoId);

  const response = await fetch(`/watch?v=${videoId}`);
  if (!response.ok) throw new Error(`YouTube replied with ${response.status}`);

  const match = (await response.text()).match(KEYWORDS_IN_HTML);
  const parsed = match ? JSON.parse(match[1]) : null;
  const tags = Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === 'string') : [];

  tagCache.set(videoId, tags);
  return tags;
}

/**
 * Builds the row in its loading state. The video id rides along in a data
 * attribute so sync() can tell a stale row from a current one.
 */
function buildRow(videoId) {
  const row = document.createElement('div');
  row.id = 'yaytv-tags-row';
  row.dataset.videoId = videoId;

  const label = document.createElement('span');
  label.className = 'yaytv-label';
  label.textContent = t('rowTagsLabel');

  const list = document.createElement('span');
  list.className = 'yaytv-tags yaytv-muted';
  list.textContent = t('rowTagsContentLoading');

  row.append(label, list);
  return row;
}

/**
 * Swaps the loading text for the tags, or for the empty-state message.
 * Tags are spans, not links, so they can be selected and copied without navigating.
 */
function fillRow(row, tags) {
  const list = row.querySelector('.yaytv-tags');
  list.replaceChildren();

  if (tags.length === 0) {
    list.classList.add('yaytv-muted');
    list.textContent = t('rowTagsContentEmpty');
    return;
  }

  list.classList.remove('yaytv-muted');
  for (const tag of tags) {
    const item = document.createElement('span');
    item.className = 'yaytv-tag';
    item.textContent = tag;
    list.append(item);
  }
}

/** Places the row at the first anchor present. False means the metadata hasn't rendered yet. */
function insertRow(row) {
  for (const { selector, position } of ANCHORS) {
    const anchor = document.querySelector(selector);
    if (anchor) {
      anchor.insertAdjacentElement(position, row);
      return true;
    }
  }
  return false;
}

/**
 * Brings the page in line with the current URL: no watch page means no row, a
 * new video means a fresh one, the same video means leave it alone. Idempotent
 * by design — every trigger below calls it, often several times per navigation.
 */
async function sync() {
  const videoId = currentVideoId();
  const existing = document.getElementById('yaytv-tags-row');

  if (!videoId) {
    existing?.remove();
    return;
  }

  if (existing) {
    if (existing.dataset.videoId === videoId) return; // already showing this video
    existing.remove();
  }

  const row = buildRow(videoId);
  if (!insertRow(row)) return; // metadata not rendered yet; the observer retries

  // The fetch is slow enough that the user can navigate away mid-flight.
  const stillCurrent = () => row.isConnected && currentVideoId() === videoId;

  try {
    const tags = await getTags(videoId);
    if (stillCurrent()) fillRow(row, tags);
  } catch {
    // Still muted from the loading state, so only the text has to change.
    if (stillCurrent()) row.querySelector('.yaytv-tags').textContent = t('rowTagsContentError');
  }
}

let pending;

/**
 * Debounces sync(). The observer fires on nearly every DOM mutation YouTube
 * makes, so this collapses a burst of them into one run once things settle.
 */
function scheduleSync() {
  clearTimeout(pending);
  pending = setTimeout(sync, 200);
}

// Two triggers: the event for in-app navigation, the observer for everything
// else (metadata rendering late, layout swaps, returning to a video).
window.addEventListener('yt-navigate-finish', scheduleSync);

new MutationObserver(scheduleSync).observe(document.documentElement, {
  childList: true,
  subtree: true,
});

scheduleSync(); // the script may have loaded onto an already-rendered watch page