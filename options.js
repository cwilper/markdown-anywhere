function restoreOptions() {
  chrome.storage.sync.get({
    useDarkEditorTheme: true,
    useDarkPreviewTheme: false,
    showLineNumbers: true,
    highlightCurrentLine: true,
    hidePreview: false,
    useVim: false,
    showCloseButton: true,
    autoLaunchXWiki: false,
    editorFontSize: "1em",
    previewFontSize: "1em"
  }, function(items) {
    document.getElementById('useDarkEditorTheme').checked = items.useDarkEditorTheme,
    document.getElementById('useDarkPreviewTheme').checked = items.useDarkPreviewTheme,
    document.getElementById('showLineNumbers').checked = items.showLineNumbers,
    document.getElementById('highlightCurrentLine').checked = items.highlightCurrentLine,
    document.getElementById('hidePreview').checked = items.hidePreview;
    document.getElementById('useVim').checked = items.useVim;
    document.getElementById('showCloseButton').checked = items.showCloseButton;
    document.getElementById('autoLaunchXWiki').checked = items.autoLaunchXWiki;
    document.getElementById('editorFontSize').value = items.editorFontSize;
    document.getElementById('previewFontSize').value = items.previewFontSize;
  });
}

function saveOptions() {
  var useDarkEditorTheme = document.getElementById('useDarkEditorTheme').checked;
  var useDarkPreviewTheme = document.getElementById('useDarkPreviewTheme').checked;
  var showLineNumbers = document.getElementById('showLineNumbers').checked;
  var highlightCurrentLine = document.getElementById('highlightCurrentLine').checked;
  var hidePreview = document.getElementById('hidePreview').checked;
  var useVim = document.getElementById('useVim').checked;
  var showCloseButton = document.getElementById('showCloseButton').checked;
  var autoLaunchXWiki = document.getElementById('autoLaunchXWiki').checked;
  var editorFontSize = document.getElementById('editorFontSize').value;
  var previewFontSize = document.getElementById('previewFontSize').value;

  chrome.storage.sync.set({
    useDarkEditorTheme: useDarkEditorTheme,
    useDarkPreviewTheme: useDarkPreviewTheme,
    showLineNumbers: showLineNumbers,
    highlightCurrentLine: highlightCurrentLine,
    hidePreview: hidePreview,
    useVim: useVim,
    showCloseButton: showCloseButton,
    autoLaunchXWiki: autoLaunchXWiki,
    editorFontSize: editorFontSize,
    previewFontSize: previewFontSize
  }, function() {
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
