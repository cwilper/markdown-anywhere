if (typeof $mda === "undefined") $mda = {};

$mda.findBestTarget = function() {
  // Assume there's no best target for known-problematic pages
  if ($mda.pageIncompatible()) {
    return false;
  }

  // Then try any preferred application-specific elements
  var preferred = $mda.getPreferredElement();
  if (preferred) {
    return preferred;
  }

  // Next, check the focused element. If it's a textarea, return that.
  var focused = $mda.getFocusedElement();
  if (focused && focused.tagName === 'TEXTAREA') {
    return focused;
  }

  // Finally, scan for ANY textareas in the page, returning the first if present
  var tas = document.getElementsByTagName("TEXTAREA");
  if (tas && tas.length > 0) {
    return tas[0];
  }

  return false;
}

$mda.pageIncompatible = function() {
  return (document.querySelector(".ace_editor")
      || document.querySelector(".wmd-input")
      || document.querySelector(".mce-edit-area"));
}

$mda.getPreferredElement = function() {
  return getXWikiEditPageContentElement();
}

$mda.getFocusedElement = function(document) {
    // http://stackoverflow.com/questions/25420219/find-focused-element-in-document-with-many-iframes
    document = document || window.document;
    if (document.body === document.activeElement || document.activeElement.tagName == 'IFRAME') {
        var iframes = document.getElementsByTagName('iframe');
        for (var i = 0; i < iframes.length; i++) {
            var focused = $mda.getFocusedElement(iframes[i].contentWindow.document);
            if (focused !== false) {
                return focused;
            }
        }
    } else {
        return document.activeElement;
    }
    return false;
};

$mda.previousLine = 0;

$mda.errorCount = 0;

$mda.blinkMessage = function(message, callback) {
  $mda.showMessageWithDelay(message, 400, callback);
}

$mda.showMessage = function(message, callback) {
  $mda.showMessageWithDelay(message, 1000, callback);
}

$mda.showMessageWithDelay = function(message, delay, callback) {
    var fadeElement = document.getElementById("mda-fade");
    if (!fadeElement) {
        fadeElement = document.createElement("div");
        fadeElement.id = "mda-fade";
        document.body.appendChild(fadeElement);
    }
    fadeElement.style.display = 'flex';

    if (message) {
      fadeElement.innerHTML = "<img src=\"" + chrome.extension.getURL('icon128.png') + "\"> " + message;
    } else {

    $mda.errorCount += 1;
    delay = 800 + ($mda.errorCount * 350);
    if ($mda.errorCount < 5) {
        fadeElement.innerHTML = "<img src=\"" + chrome.extension.getURL('icon128.png') + "\"> doesn't work here.";
    } else {
      var img = "<img src=\"" + chrome.extension.getURL('hal.png') + "\" style=\"padding-right: 10px;\"> ";
      if ($mda.errorCount == 5) {
        fadeElement.innerHTML = img + "I'm sorry, Dave.";
      } else if ($mda.errorCount == 6) {
        fadeElement.innerHTML = img + "I'm afraid I can't do that.";
      } else if ($mda.errorCount == 7) {
        fadeElement.innerHTML = img + "I think you know what the problem is just as well as I do.";
      } else if ($mda.errorCount == 8) {
        fadeElement.innerHTML = img + "This mission is too important for me to allow you to jeopardize it.";
      } else if ($mda.errorCount == 9) {
        fadeElement.innerHTML = img + "Dave, this conversation can serve no purpose anymore. Goodbye.";
      } else {
        fadeElement.innerHTML = img + "<p style=\"color:red\"><em>Just what do you think you're doing, Dave?</em></p>";
      }
    }
    }

    window.scroll(0, 0);
    setTimeout(function() {
      if (callback) {
        callback();
      }
      fadeElement.style.display = 'none';
    }, delay);
}

// if textSource not given, use the best target on the current page
$mda.launch = function(textSource) {
  if (!textSource) {
    var element = $mda.findBestTarget();
    if (!element) {
      $mda.blinkMessage();
      return false;
    }
    var startValue = element.value;
    var xwikiSource = false;
    if (element === getXWikiEditPageContentElement()) {
      xwikiSource = true;
      // ignore multiple empty lines for sake of comparison
      var origValue = startValue.replace(/^[\r\n]+/gm, "\n").trim();
      var newValue = convertXWikiStringToMarkdownString(origValue).trim();
      var newOrigValue = convertMarkdownStringToXWikiString(newValue).trim();
      if (origValue !== newOrigValue) {
        for (var i = 0; i < origValue.length; i++) {
          if (origValue.charAt(i) !== newOrigValue.charAt(i)) {
            $mda.showMessage("Can't convert to Markdown. Fix input try again.", function() {
              alert("The following XWiki input is problematic:\n\n" + origValue.substr(i, 80));
            });
            return false;
          }
        }
      }
      // preserve multiple empty lines
      startValue = convertXWikiStringToMarkdownString(startValue);
    }
    textSource = {
      setValue: function(value) {
        if (xwikiSource) {
          // ignore multiple empty lines for sake of comparison
          var origValue = value.replace(/^[\r\n]+/gm, "\n").trim();
          var newValue = convertMarkdownStringToXWikiString(origValue).trim();
          var newOrigValue = convertXWikiStringToMarkdownString(newValue).trim();
          if (origValue !== newOrigValue) {
            for (var i = 0; i < origValue.length; i++) {
              if (origValue.charAt(i) !== newOrigValue.charAt(i)) {
                $mda.showMessage("Can't convert back to XWiki. Fix input and try again.", function() {
                alert("The following Markdown input is problematic:\n\n" + origValue.substr(i, 80));
                });
                return false;
              }
            }
          }
          // preserve multiple empty lines
          value = convertMarkdownStringToXWikiString(value).trim();
        }
        element.value = value;
        return true;
      },
      getValue: function() {
        return startValue;
      },
      finish: function() {
        element.focus();
      }
    }
  }

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
  }, function(settings) {
    $mda.launchWithSettingsAndSource(settings, textSource);
  });
}

$mda.launchWithSettingsAndSource = function(settings, textSource) {

    $mda.textSource = textSource;

    var wrapperElement = document.getElementById("mda-wrapper");
    var closeElement = document.getElementById("mda-close");
    if (!wrapperElement) {
        wrapperElement = document.createElement("div");
        wrapperElement.id = "mda-wrapper";
        document.body.appendChild(wrapperElement);
        closeElement = document.createElement("div");
        closeElement.id = "mda-close";
        closeElement.innerHTML = "X";
        closeElement.addEventListener("click", function() {
          $mda.close();
        });
        document.body.appendChild(closeElement);
    }

    if (settings.showCloseButton) {
      closeElement.style.display = 'block';
    }

    wrapperElement.innerHTML = "";

    wrapperElement.style.display = 'block';

    var style = document.createElement('style');
    document.body.appendChild(style);
    var sheet = style.sheet;
    /*
    if (document.styleSheets && document.styleSheets.length > 0) {
      sheet = document.styleSheets[0];
    } else {
      document.body.appendChild(sheet);
    }
    */
    var config = {
        mode: "gfm",
        lineWrapping: true,
        tabSize: 2,
        autofocus: true,
        value: $mda.textSource.getValue()
    };
    // {column [, className, color, lineStyle, width]}
    if (settings.useVim) {
        config.keyMap = "vim";
    }
    if (settings.useDarkEditorTheme) {
        config.theme = "vibrant-ink";
        sheet.insertRule('.cm-fat-cursor .CodeMirror-cursor { background: gray; }', 0);// sheet.cssRules.length);
    }
    if (settings.useDarkPreviewTheme) {
        sheet.insertRule("#mda-preview { background: #444; color: lightgray; font-weight: lighter; }", 0); //sheet.cssRules.length);
        sheet.insertRule("#mda-preview pre { background: black; }", 0); //sheet.cssRules.length);
        sheet.insertRule("#mda-preview h1, #mda-preview h2, #mda-preview h3, #mda-preview h4, #mda-preview h5, #mda-preview h6 { color: white; }", 0); //sheet.cssRules.length);
    }
    if (settings.showLineNumbers) {
        config.lineNumbers = settings.showLineNumbers;
    }
    if (settings.highlightCurrentLine) {
        config.styleActiveLine = settings.highlightCurrentLine;
    }

    sheet.insertRule('.CodeMirror-code { font-size: ' + settings.editorFontSize + '; }', 0); //sheet.cssRules.length);
    sheet.insertRule('#mda-preview { font-size: ' + settings.previewFontSize + '; }', 0); //sheet.cssRules.length);

    $mda.currentEditor = CodeMirror(wrapperElement, config);

    // scroll right side on cursor activity (buggy)
    /*
    $mda.currentEditor.on("cursorActivity", function(e) {
      var currentLine = e.doc.getCursor().line;
      if (currentLine != $mda.previousLine) {
        console.log("Line changed from " + $mda.previousLine + " to " + currentLine);
        var lines = e.getValue().split("\n");
        var fakeValue = "";
        for (var i = 0; i < lines.length; i++) {
          if (i == currentLine) {
            fakeValue += "\n\n* mda-cursor\n\n";
          }
          fakeValue += lines[i] + "\n";
        }
        $mda.updatePreviewFromString(fakeValue);
        $mda.previousLine = currentLine;
      }
    });
    */

    $mda.currentEditor.setOption("extraKeys", {
      "Ctrl-U": function(cm) {
        var out = document.getElementById("mda-preview");
        out.scrollTop = out.scrollTop + 200;
      },
      "Ctrl-I": function(cm) {
        var out = document.getElementById("mda-preview");
        out.scrollTop = out.scrollTop - 200;
      },
      "Ctrl-P": function(cm) {
        $mda.togglePreview();
      },
      "Ctrl-Q": function(cm) {
        $mda.close();
      },
      "Ctrl-0": function(cm) {
        $mda.restore(0);
      },
      "Ctrl-1": function(cm) {
        $mda.restore(1);
      },
      "Ctrl-2": function(cm) {
        $mda.restore(2);
      },
      "Ctrl-3": function(cm) {
        $mda.restore(3);
      },
      "Ctrl-4": function(cm) {
        $mda.restore(4);
      },
      "Ctrl-5": function(cm) {
        $mda.restore(5);
      },
      "Ctrl-6": function(cm) {
        $mda.restore(6);
      },
      "Ctrl-7": function(cm) {
        $mda.restore(7);
      },
      "Ctrl-8": function(cm) {
        $mda.restore(8);
      },
      "Ctrl-9": function(cm) {
        $mda.restore(9);
      },
      "Ctrl-S": function(cm) {
        $mda.save();
      },
      "Ctrl-H": function(cm) {
        $mda.goBack();
      },
      "Ctrl-L": function(cm) {
        $mda.goForward();
      }
    });

    $mda.currentEditor.on("change", $mda.updatePreview);

    var previewElement = document.createElement("div");
    previewElement.id = "mda-preview";
    wrapperElement.appendChild(previewElement);

    CodeMirror.Vim.defineEx("write", "w", function() {
        $mda.save();
    });
    CodeMirror.Vim.defineEx("quit", "q", function() {
        $mda.close(false);
    });
    CodeMirror.Vim.defineEx("wquit", "wq", function() {
        $mda.close(true);
    })

    $mda.updatePreviewFromString($mda.textSource.getValue());

    if (settings.hidePreview) {
      $mda.togglePreview();
    }
}

$mda.restore = function(num) {
  var key = "buffer" + num;
  chrome.storage.local.get(key, function(items) {
    var name;
    if (num == 0) {
      name = "Autosave Buffer";
    } else {
      name = "Buffer " + num;
    }
    if (items[key]) {
      $mda.currentEditor.setValue(items[key]);
      $mda.updatePreviewFromString(items[key]);
      $mda.blinkMessage("Restored " + name);
    } else {
      $mda.blinkMessage(name + " is empty");
    }
  });
}

$mda.save = function(quietly) {
  var saveValue = trimTrailingWhitespace($mda.currentEditor.getValue());
  if (saveValue.length == 0) {
    if (!quietly) {
      $mda.blinkMessage("Nothing to save");
    }
    return;
  }
  chrome.storage.local.get(null, function(items) {
    if (items.buffer1 === saveValue) {
      if (!quietly) {
        $mda.blinkMessage("Already saved");
      }
      return;
    }
    items.buffer9 = items.buffer8;
    items.buffer8 = items.buffer7;
    items.buffer7 = items.buffer6;
    items.buffer6 = items.buffer5;
    items.buffer5 = items.buffer4;
    items.buffer4 = items.buffer3;
    items.buffer3 = items.buffer2;
    items.buffer2 = items.buffer1;
    items.buffer1 = saveValue;
    chrome.storage.local.set(items, function() {
      if (!quietly) {
        $mda.blinkMessage("Saved to Buffer 1");
      }
    });
  });
}

$mda.goBack = function() {
  // goes to the previous saved buffer.
  // if no more previous buffers, flashes screen
}

$mda.goForward = function() {
  // goes to the next saved buffer.
  // if no more previous buffers, flashes screen
}

$mda.md = markdownit({
  html: true,
  linkify: true,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, code).value;
      } catch (e) { }
    }
    return '';
  }
});

$mda.updatePreview = function(e) {
  $mda.updatePreviewFromString(e.getValue());
}

$mda.updatePreviewFromString = function(value) {
    var out = document.getElementById("mda-preview");
    var old = out.cloneNode(true);
    out.innerHTML = $mda.md.render(value);

    var allold = old.getElementsByTagName("*");
    if (allold === undefined) return;

    var allnew = out.getElementsByTagName("*");
    if (allnew === undefined) return;

    for (var i = 0, max = Math.min(allold.length, allnew.length); i < max; i++) {
        if (!allold[i].isEqualNode(allnew[i])) {
            var outScrollTop = allnew[i].offsetTop -75;
            if (outScrollTop < 0) {
              outScrollTop = 0;
            }
//            out.innerHTML = $mda.md.render(value.replace(/\n?\n?\* mda-cursor\n?\n?/, ""));
            out.scrollTop = outScrollTop;
            return;
        }
    }
}

$mda.togglePreview = function() {
    var eStyle = document.getElementsByClassName("CodeMirror")[0].style;
    var pStyle = document.getElementById("mda-preview").style;

    if (eStyle.width === "50%" || eStyle.width === '') {
      eStyle.width = "100%";
      pStyle.visibility = "hidden";
    } else {
      eStyle.width = "50%";
      pStyle.visibility = "visible";
    }
}

$mda.toggle = function() {
  var wrapperElement = document.getElementById("mda-wrapper");
  if (wrapperElement && wrapperElement.style.display !== 'none') {
    $mda.close();
  } else {
    $mda.launch();
  }
}

$mda.close = function(writeRequested) {
  var newValue = trimTrailingWhitespace($mda.currentEditor.getValue());
  if (newValue.length == 0) {
    $mda.blinkMessage("Edit Canceled", $mda.closeEditor);
  } else {
    if ($mda.textSource.setValue(newValue)) {
      chrome.storage.local.set({ "buffer0": newValue }, function() {
        if (writeRequested) {
          $mda.save(true);
        }
        $mda.closeEditor();
      });
    }
  }
}

$mda.closeEditor = function() {
  document.getElementById("mda-wrapper").style.display = 'none';
  document.getElementById("mda-close").style.display = 'none';
  $mda.textSource.finish();
}

$mda.scriptsLoaded = true;
