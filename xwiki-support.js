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

function isReversibleXWikiContentElement(targetElement) {
    var containerElement = document.getElementById('xwikimaincontainer');
    if (!containerElement || targetElement.id !== 'content') {
        return false;
    }
    var origValue = trimTrailingWhitespace(targetElement.value.trim());
    var newValue = convertXWikiStringToMarkdownString(origValue).trim();
    var newOrigValue = convertMarkdownStringToXWikiString(newValue).trim();
    return origValue === newOrigValue;
}

function trimTrailingWhitespace(inputString) {
    return inputString.replace(/[^\S\r\n]+$/gm, "");
}

function convertXWikiStringToMarkdownString(oldValue) {
    return transformXWikiContent(oldValue, convertNonLiteralXWikiLinesToMarkdownString);
}

function transformXWikiContent(oldValue, stringArrayTransformingFunction) {
    var lines = oldValue.split("\n");
    var newValue = "";
    var inLiteralSection = false;
    var currentChunk = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();

        if ((!inLiteralSection && trimmedLine.startsWith("{{code")) ||
            (inLiteralSection && trimmedLine.startsWith("{{/code"))) {
            if (currentChunk.length > 0) {
                if (inLiteralSection) {
                    newValue += currentChunk.join("\n") + "\n";
                    newValue += "```\n";
                } else {
                    newValue += stringArrayTransformingFunction(currentChunk);
                    var parts = trimmedLine.split("\"");
                    if (parts.length > 2) {
                        newValue += "```" + parts[1] + "\n";
                    } else {
                        newValue += "```\n";
                    }
                }
            }
            inLiteralSection = !inLiteralSection;
            currentChunk = [];
        } else {
            currentChunk.push(line);
        }
    }

    if (currentChunk.length > 0) {
        if (inLiteralSection) {
            newValue += currentChunk.join("\n") + "\n";
            newValue += "```\n";
        } else {
            newValue += stringArrayTransformingFunction(currentChunk);
        }
    }

    return newValue;
}

function convertNonLiteralXWikiLinesToMarkdownString(lines) {
    var newValue = "";

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();

        // Headings
        if (trimmedLine.startsWith("=")) {
            var headingLevel = trimmedLine.indexOf("= ") + 1;
            if (headingLevel > 0) {
                var headingTextWithSuffix = trimmedLine.substr(headingLevel + 1);
                var headingTextLength = headingTextWithSuffix.indexOf(" =");
                if (headingTextLength > 0) {
                    var headingText = headingTextWithSuffix.substr(0, headingTextLength);
                    newValue += Array(headingLevel + 1).join("#") + " " + headingText + "\n";
                    continue;
                }
            }
        }

        // Bullets
        if (/^\*+ /.test(trimmedLine)) {
            var indentLevel = trimmedLine.indexOf("* ") + 1;
            if (indentLevel > 1) {
                newValue += Array(indentLevel).join("  ") + "*" + trimmedLine.substr(indentLevel) + "\n";
                continue;
            }
        }
        // Escape leading slashes so they aren't interpreted as bullets
        if (/^- /.test(trimmedLine)) {
            newValue += "\\" + trimmedLine + "\n";
            continue;
        }

        newValue += line + "\n";
    }

    // Inline Images: [[image:filename]] to ![](filename)
    newValue = newValue.replace(/\[\[image:([^\]]+)\]\]/g, "![]($1)");

    // Untitled Links: [[http://]] to [http://](http://)
    newValue = newValue.replace(/\[\[([^>\]]+)\]\]/g, "[$1]($1)");

    // Links: [[title>>http://]] to [title](http://)
    newValue = newValue.replace(/\[\[([^>]+)>>([^\]]+)\]\]/g, "[$1]($2)");

    // Italic text: //text// to *text*
    newValue = newValue.replace(/([^/\:]|^)\/\/([^ ][^\/]*)\/\//g, "$1*$2*");

    // Monospaced text: ##text## to `text`
    newValue = newValue.replace(/(^|[^#])##([^# ][^#]*)##/g, "$1`$2`");

    // Other macros: {{..}} <!--{{..}}-->
    newValue = newValue.replace(/^(\{\{[^\}]+\}\})/g, "<!--$1-->");
    newValue = newValue.replace(/([^-])(\{\{[^\}]+\}\})/g, "$1<!--$2-->");

    // Special formatting: (%..%) to <!--(%..%)-->\n
    newValue = newValue.replace(/^(\(%[^%]*%\))/g, "<!--$1-->\n");
    newValue = newValue.replace(/([^-])(\(%[^%]*%\))/g, "$1<!--$2-->\n");

    return newValue;
}

function convertMarkdownStringToXWikiString(oldValue) {
    var lines = oldValue.split("\n");
    var newValue = "";
    var inLiteralSection = false;
    var currentChunk = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();

        if (trimmedLine.startsWith("```")) {
            if (currentChunk.length > 0) {
                if (inLiteralSection) {
                    newValue += currentChunk.join("\n") + "\n";
                    newValue += "{{/code}}\n";
                } else {
                    newValue += convertNonLiteralMarkdownLinesToXWikiString(currentChunk);
                    var lang = trimmedLine.substr(3);
                    if (lang.length > 0) {
                        newValue += "{{code language=\"" + lang + "\"}}\n";
                    } else {
                        newValue += "{{code}}\n";
                    }
                }
            }
            inLiteralSection = !inLiteralSection;
            currentChunk = [];
        } else {
            currentChunk.push(line);
        }
    }

    if (currentChunk.length > 0) {
        if (inLiteralSection) {
            newValue += currentChunk.join("\n") + "\n";
            newValue += "{{/code}}\n";
        } else {
            newValue += convertNonLiteralMarkdownLinesToXWikiString(currentChunk);
        }
    }

    return newValue;
}

function convertNonLiteralMarkdownLinesToXWikiString(lines) {
    var newValue = "";

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();

        // Headings
        if (trimmedLine.startsWith("#")) {
            var headingLevel = trimmedLine.indexOf("# ") + 1;
            if (headingLevel > 0) {
                var headingText = trimmedLine.substr(headingLevel + 1);
                var e = Array(headingLevel + 1).join("=");
                newValue += e + " " + headingText + " " + e + "\n";
                continue;
            }
        }

        // Bullets
        if (/^\*+ /.test(trimmedLine)) {
            var indentLevel = line.indexOf("* ") + 1;
            if (indentLevel > 1) {
                newValue += Array(Math.floor((indentLevel + 1) / 2)).join("*") + "*" + line.substr(indentLevel) + "\n";
                continue;
            }
        }
        // Unescape leading slashes
        if (/^\\- /.test(trimmedLine)) {
            newValue += trimmedLine.substr(1) + "\n";
            continue;
        }

        newValue += line + "\n";
    }

    // Inline Images: ![](filename) to [[image:filename]]
    newValue = newValue.replace(/!\[\]\(([^\)]+)\)/g, "[[image:$1]]");

    // Links: [title](http://) to [[title>>http://]]
    newValue = newValue.replace(/\[([^\]]+)]\(([^\)]+)\)/g, "[[$1>>$2]]");

    // Italic text: ^*text* or [^*]text to //text//
    newValue = newValue.replace(/^\*([^\*]+)\*/g, "//$1//");
    newValue = newValue.replace(/([^\*])\*([^\* ][^\*]*)\*/g, "$1//$2//");

    // Monospaced text: `text` to ##text##
    newValue = newValue.replace(/(^|[^`])`([^`]+)`/g, "$1##$2##");

    // Macros: <!--{{..}}--> to {{..}}
    newValue = newValue.replace(/<!--(\{\{[^\}]*\}\})-->/g, "$1");

    // Special formatting: <!--(%..%)--> to (%..%)[\n]
    newValue = newValue.replace(/<!--(\(%[^%]+%\))-->[^\n]/g, "$1");
    newValue = newValue.replace(/<!--(\(%[^%]+%\))-->(\n*)/g, "$1\n");

    return newValue;
}
