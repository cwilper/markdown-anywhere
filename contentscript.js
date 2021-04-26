// To avoid performance impact on every page, most code won't be loaded
// until we're sure it's needed. See loading code in background.js.

// Global namespace for Markdown Anywhere
var $mda =
{
    scriptsLoaded: false,
    launchMode: null,
    targetElement: null,
    currentEditor: null,
    useVim: null,
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request === "getScriptsLoaded") {
            sendResponse($mda.scriptsLoaded);
        }
    }
);

// lifted from jquery
function _elementIsVisible(elem) {
  return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
}

function getXWikiEditPageContentElement() {
    var containerElement = document.getElementById('xwikimaincontainer');
    var contentElement = document.getElementById('content');
    if (containerElement && contentElement && contentElement.tagName === "TEXTAREA"
        && _elementIsVisible(contentElement)) {
        return contentElement;
    }
    return false;
}

// See if it looks like we're on an XWiki edit page.
// If so, and they have elected to try auto-launching from xwiki pages,
// send an appropriate message to the background page to start the process.
if (getXWikiEditPageContentElement()) {
  chrome.storage.sync.get({ autoLaunchXWiki: false }, function(settings) {
    if (settings.autoLaunchXWiki) {
      chrome.runtime.sendMessage("tryAutoLaunchXWiki");
    }
  });
}
