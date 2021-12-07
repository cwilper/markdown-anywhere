// Adds a listener that is invoked when a hotkey is pressed, which loads the
// prerequisite css and scripts into the current page, and launches
// the editor (or closes the editor if it's open).

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request === "tryAutoLaunchXWiki") {
      toggleEditor();
    }
  }
);

chrome.pageAction.onClicked.addListener(function(tab) {
    toggleEditor();
});

chrome.commands.onCommand.addListener(function(command) {
    if (command === 'toggle-editor') {
      toggleEditor();
    } else if (command === 'toggle-preview') {
      togglePreview();
    }
});

function toggleEditor() {
  runInCurrentTab("$mda.toggle();", true, false);
}

function togglePreview() {
  runInCurrentTab("$mda.togglePreview();", true, true);
}

function runInCurrentTab(code, scriptsRequired, skipIfNotLoaded) {
  chrome.tabs.query( { active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, "getScriptsLoaded", function(scriptsLoaded) {
      if (!scriptsRequired || scriptsLoaded) {
        executeScripts(null, [ { code: code } ]);
      } else if (!skipIfNotLoaded) {
        executeScripts(null, [
          { file: "highlightjs/styles/darcula.css" },
          { file: "CodeMirror/lib/codemirror.css" },
          { file: "CodeMirror/addon/dialog/dialog.css" },
          { file: "CodeMirror/theme/vibrant-ink.css" },
          { file: "preview.css" },
          { file: "style.css" },

          { file: "highlightjs/highlight.pack.js" },
          { file: "markdown-it/markdown-it.min.js" },
          { file: "CodeMirror/lib/codemirror.js" },
          { file: "CodeMirror/addon/dialog/dialog.js" },
          { file: "CodeMirror/addon/display/panel.js" },
          { file: "CodeMirror/addon/mode/overlay.js" },
          { file: "CodeMirror/addon/search/searchcursor.js" },
          { file: "CodeMirror/addon/selection/active-line.js" },
          { file: "CodeMirror/keymap/vim.js" },
          { file: "CodeMirror/mode/clike/clike.js" },
          { file: "CodeMirror/mode/css/css.js" },
          { file: "CodeMirror/mode/gfm/gfm.js" },
          { file: "CodeMirror/mode/htmlmixed/htmlmixed.js" },
          { file: "CodeMirror/mode/javascript/javascript.js" },
          { file: "CodeMirror/mode/meta.js" },
          { file: "CodeMirror/mode/markdown/markdown.js" },
          { file: "CodeMirror/mode/properties/properties.js" },
          { file: "CodeMirror/mode/shell/shell.js" },
          { file: "CodeMirror/mode/sql/sql.js" },
          { file: "CodeMirror/mode/xml/xml.js" },
          { file: "CodeMirror/mode/yaml/yaml.js" },
          { file: "markdown-anywhere.js" },
          { file: "xwiki-support.js" },
          { code: code } ]);
      }
    });
  });
}

// Loads the given scripts into the given tab's page asynchronously,
// respecting the order they're given in.
function executeScripts(tabId, injectDetailsArray) {
    function createCallback(tabId, injectDetails, innerCallback) {
        return function () {
            if (injectDetails.file) {
                if (injectDetails.file.endsWith(".css")) {
                    chrome.tabs.insertCSS(tabId, injectDetails, innerCallback);
                } else {
                    chrome.tabs.executeScript(tabId, injectDetails, innerCallback);
                }
            } else {
                chrome.tabs.executeScript(tabId, injectDetails, innerCallback);
            }
        };
    }
    var callback = null;
    for (var i = injectDetailsArray.length - 1; i >= 0; --i)
        callback = createCallback(tabId, injectDetailsArray[i], callback);
    if (callback !== null)
        callback();
}
