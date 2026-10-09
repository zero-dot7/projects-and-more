/* MV3 service worker: Ctrl+Q quick-add (todo pkt 1).
   chrome.commands works browser-wide; user can rebind at brave://extensions/shortcuts.
   Flow: query ACTIVE tab (url+title) -> look for existing speed-dial newtab tab
   (hash #quick-add) -> focus it, else create a new one; pass data via sessionStorage
   (postMessage can be missed if the page is still loading). */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'quick-add-tile') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true, lastFocusedWindow: true });
  const pageUrl = (tab && tab.url && /^(https?|file):/.test(tab.url)) ? tab.url : '';
  const pageTitle = (tab && tab.title) || '';
  const payload = { pageUrl, pageTitle };
  // data first (eliminates race with page load), then navigate:
  await chrome.storage.session.set({ 'quick-add': payload });

  const url = chrome.runtime.getURL('newtab.html') + '#quick-add';
  // re-use a speed-dial tab if one is open (keeps tabs tidy); user answers said
  // "open a NEW tab", so only reuse when the CURRENT tab already is speed-dial.
  if (tab && tab.url && tab.url.startsWith(chrome.runtime.getURL(''))) {
    await chrome.tabs.update(tab.id, { active: true, url });
  } else {
    await chrome.tabs.create({ url });
  }
});
