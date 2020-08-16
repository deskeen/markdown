'use strict'
/* eslint-env node */
/* eslint-disable no-underscore-dangle */

const HTML_ESCAPED_CHAR_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#x27;',
}

const HTML_ESCAPED_CHAR_REGEX =
  new RegExp(`[${Object.keys(HTML_ESCAPED_CHAR_MAP).join('')}]`, 'g')

const replaceHtmlChars = text =>
  text.replace(HTML_ESCAPED_CHAR_REGEX, char => HTML_ESCAPED_CHAR_MAP[char])

const MARKDOWN_CHARS = [
  '*',
  '[',
  '`',
  '!',
  '#',
  '~',
  '^',
].join('')

const MARKDOWN_ESCAPE_CHAR = '\\'

const ESCAPE_CHAR_REGEX =
  new RegExp(`\\${MARKDOWN_ESCAPE_CHAR}([${MARKDOWN_CHARS}])`, 'g')

const removeEscapeChar = text =>
  text.replace(ESCAPE_CHAR_REGEX, (match, char) => char)

const pipe = (...funcs) => value =>
  funcs.reduce((res, func) => func(res), value)

const escapeText = text => pipe(
  replaceHtmlChars,
  removeEscapeChar
)(text)

const TEXT_REGEX = new RegExp(`[${MARKDOWN_CHARS}]`)

class Element {
  constructor(tagName) {
    if (tagName) {
      this.tagName = tagName
    }

    this.attr = {}
    this.children = []
  }

  appendChild(node) {
    if (typeof node !== 'string') {
      node.parentNode = this
    }

    this.children.push(node)
  }

  hasAttribute(attributeName) {
    return this.attr[attributeName] !== undefined
  }

  setAttribute(attributeName, attributeValue) {
    this.attr[attributeName] = attributeValue
  }

  getAttribute(attributeName) {
    return this.attr[attributeName]
  }

  removeAttribute(attributeName) {
    this.attr[attributeName] = undefined
  }

  get attributes() {
    return this.attr
  }

  get tagName() {
    return this._tagName
  }

  // https://dom.spec.whatwg.org/#dom-element-tagname
  set tagName(value) {
    this._tagName = value.toUpperCase()
  }

  get textContent() {
    return this.children[0]
  }

  set textContent(value) {
    this.children = [value]
  }

  get firstChild() {
    return this.children[0]
  }

  get lastChild() {
    return this.children[this.children.length - 1]
  }

  toHtml() {
    let html = ''

    if (this._tagName != null) {
      html += `<${this.tagName.toLowerCase()}`

      if (this.attr != null) {
        for (const attrName of Object.keys(this.attr)) {
          html += ` ${attrName}="${this.attr[attrName]}"`
        }
      }

      if (this.children.length === 0) {
        html += ' /'
      }

      html += '>'
    }

    for (const child of this.children) {
      if (typeof child === 'string') {
        html += escapeText(child)
      } else {
        html += child.toHtml()
      }
    }

    if (this.tagName != null) {
      if (this.children.length) {
        html += `</${this.tagName.toLowerCase()}>`
      }
    }

    return html
  }
}

const document = {
  createElement: tagName => new Element(tagName),
  createTextNode: text => text,
}

const parseBoolean = (value, defaultValue) =>
  typeof value === 'boolean'
    ? value
    : defaultValue

const parseMaxHeader = (value, defaultValue) => {
  if (Number.isInteger(value)
  && value >= 1
  && value <= 6) {
    return value
  }

  return defaultValue
}

/**
 * @param {string} markdownText Markdown text
 * @param {object} opt Parser options
 * @param {boolean} [opt.brOnBlankLine=false]
 * @param {boolean} [opt.allowHeader=true]
 * @param {boolean} [opt.allowLink=true]
 * @param {boolean} [opt.allowImage=true]
 * @param {boolean} [opt.allowImageStyle=false]
 * @param {boolean} [opt.allowCode=true]
 * @param {boolean} [opt.allowMultilineCode=true]
 * @param {boolean} [opt.allowUnorderedList=true]
 * @param {boolean} [opt.allowOrderedList=true]
 * @param {boolean} [opt.allowNestedList=true]
 * @param {boolean} [opt.allowHorizontalLine=true]
 * @param {boolean} [opt.allowQuote=true]
 * @param {boolean} [opt.allowReference=true]
 * @param {function} [opt.onHeader]
 * @param {function} [opt.onLink]
 * @param {function} [opt.onImage]
 * @param {function} [opt.onVideo]
 * @param {function} [opt.onCode]
 * @param {function} [opt.onMultilineCode]
 * @param {function} [opt.onUnorderedList]
 * @param {function} [opt.onOrderedList]
 * @param {function} [opt.onHorizontalLine]
 * @param {function} [opt.onQuote]
 * @param {function} [opt.onReference]
 */
const parse = (markdownText, opt = {}) => {
  const allowHeader = parseBoolean(opt.allowHeader, true)
  const allowLink = parseBoolean(opt.allowLink, true)
  const allowImage = parseBoolean(opt.allowImage, true)
  const allowImageStyle = parseBoolean(opt.allowImageStyle, false)
  const allowCode = parseBoolean(opt.allowCode, true)
  const allowMultilineCode = parseBoolean(opt.allowMultilineCode, true)
  const allowUnorderedList = parseBoolean(opt.allowUnorderedList, true)
  const allowOrderedList = parseBoolean(opt.allowOrderedList, true)
  const allowNestedList = parseBoolean(opt.allowNestedList, true)
  const allowHorizontalLine = parseBoolean(opt.allowHorizontalLine, true)
  const allowQuote = parseBoolean(opt.allowQuote, true)
  const allowReference = parseBoolean(opt.allowReference, true)
  const brOnBlankLine = parseBoolean(opt.brOnBlankLine, false)
  const maxHeader = parseMaxHeader(opt.maxHeader, 3)

  const body = new Element()

  let cursor = 0

  const text = `${markdownText}\n`
  const textSize = text.length

  while (cursor < textSize) {
    const restText = text.substring(cursor)
    const EOLIndex = restText.indexOf('\n')
    const lineText = restText.substring(0, EOLIndex)
    const nextRestText = restText.substring(EOLIndex + 1)

    if (lineText.trim().length === 0) {
      if (brOnBlankLine) {
        body.appendChild(document.createElement('BR'))
      }
    } else {
      let lineCursor = 0
      let lastFlushCursor = 0
      const next = n => lineText[lineCursor + n]

      let currentLine
      let parseLine = true
      let onLineEnd
      let targetNode = body

      const flush = node => {
        if (currentLine == null) {
          currentLine = document.createElement('P')
        }

        if (lastFlushCursor < lineCursor) {
          const textNode = document.createTextNode(
            lineText.substring(lastFlushCursor, lineCursor))

          currentLine.appendChild(textNode)

          lastFlushCursor = lineCursor
        }

        if (node != null) {
          currentLine.appendChild(node)
        }
      }

      const firstChar = lineText[0]

      if (firstChar === MARKDOWN_ESCAPE_CHAR) {
        lineCursor = 1
      } else if (allowHeader
      && firstChar === '#') {
        let headerLevel = 1

        while (headerLevel < maxHeader
        && next(headerLevel) === '#') {
          headerLevel += 1
        }

        if (next(headerLevel) === ' ') {
          const headerText = lineText.substring(lineText.indexOf(' ') + 1)
          const headerNode = document.createElement(`H${headerLevel}`)
          headerNode.textContent = headerText

          if (opt.onHeader) {
            opt.onHeader(headerNode)
          }

          currentLine = headerNode
          parseLine = false
        }
      } else if (firstChar === '!') {
        if (next(1) === '['
        && allowImage) {
          const restLineText = lineText.substring(lineCursor + 1)
          const endMatch = /^\[([^\]]+)]\(([^;)]+)(;([^)]+))?\)/
            .exec(restLineText)

          if (endMatch) {
            const title = endMatch[1]
            const url = endMatch[2]
            const style = endMatch[4]

            const figureNode = document.createElement('FIGURE')

            if (allowImageStyle
            && style != null) {
              figureNode.setAttribute('style', style)
            }

            const isVideo = url.endsWith('.mp4')

            if (isVideo) {
              const sourceNode = document.createElement('SOURCE')
              sourceNode.setAttribute('src', url)
              sourceNode.setAttribute('type', 'video/mp4')

              const videoNode = document.createElement('VIDEO')

              videoNode.appendChild(sourceNode)

              if (opt.onVideo) {
                opt.onVideo(videoNode)
              }

              figureNode.appendChild(videoNode)
            } else {
              const imageNode = document.createElement('IMG')
              imageNode.setAttribute('src', url)
              imageNode.setAttribute('alt', '')

              if (opt.onImage) {
                opt.onImage(imageNode, title, url)
              }

              figureNode.appendChild(imageNode)
            }

            const captionNode = document.createElement('FIGCAPTION')
            captionNode.textContent = title

            figureNode.appendChild(captionNode)

            currentLine = figureNode
            parseLine = false
          }
        }
      } else if (firstChar === '-') {
        if (allowHorizontalLine
        && lineText === '---') {
          const hrNode = document.createElement('HR')

          if (opt.onHorizontalLine) {
            opt.onHorizontalLine(hrNode)
          }

          currentLine = hrNode
          parseLine = false
        } else if (allowUnorderedList
        && next(1) === ' ') {
          if (body.lastChild == null
          || body.lastChild.tagName !== 'UL') {
            body.appendChild(document.createElement('UL'))
          }

          targetNode = body.lastChild
          currentLine = document.createElement('LI')
          lineCursor = 2
          lastFlushCursor = lineCursor

          if (opt.onUnorderedList) {
            if (allowNestedList) {
              if (nextRestText.trimStart().startsWith('- ') === false) {
                onLineEnd = body => opt.onUnorderedList(body.lastChild, 1)
              }
            } else {
              if (nextRestText.startsWith('- ') === false) {
                onLineEnd = body => opt.onUnorderedList(body.lastChild, 1)
              }
            }
          }
        }
      } else if (allowOrderedList
      && firstChar === '+') {
        if (next(1) === ' ') {
          if (body.lastChild == null
          || body.lastChild.tagName !== 'OL') {
            body.appendChild(document.createElement('OL'))
          }

          targetNode = body.lastChild
          currentLine = document.createElement('LI')
          lineCursor = 2
          lastFlushCursor = lineCursor

          if (opt.onOrderedList) {
            if (allowNestedList) {
              if (nextRestText.trimStart().startsWith('+ ') === false) {
                onLineEnd = body => opt.onOrderedList(body.lastChild, 1)
              }
            } else {
              if (nextRestText.startsWith('+ ') === false) {
                onLineEnd = body => opt.onOrderedList(body.lastChild, 1)
              }
            }
          }
        }
      } else if (allowNestedList
      && firstChar === ' '
      && body.lastChild != null) {
        const lastListTag = body.lastChild.tagName

        if (lastListTag === 'UL'
        || lastListTag === 'OL') {
          const lastListSign = lastListTag === 'UL'
            ? '-'
            : '+'
          const listRegex = new RegExp(`( )+(\\${lastListSign}) `)
          const listMatch = listRegex.exec(lineText)

          if (listMatch) {
            const matchSize = listMatch[0].length
            const listSign = listMatch[2]
            const listTag = listSign === '-'
              ? 'UL'
              : 'OL'

            const parentNode = body.lastChild
            const lastItemNode = parentNode.lastChild
            const itemContentNode = lastItemNode.lastChild

            if (itemContentNode.tagName === listTag) {
              targetNode = itemContentNode
            } else {
              lastItemNode.appendChild(document.createElement(listTag))
              targetNode = lastItemNode.lastChild
            }

            currentLine = document.createElement('LI')
            lineCursor = matchSize
            lastFlushCursor = lineCursor

            const nextLineMatch = listRegex.exec(nextRestText)

            if (nextLineMatch == null) {
              if (opt.onUnorderedList
              && listTag === 'UL') {
                onLineEnd = body => {
                  opt.onUnorderedList(body.lastChild.lastChild.lastChild, 2)
                  opt.onUnorderedList(body.lastChild, 1)
                }
              } else if (opt.onOrderedList
              && listTag === 'OL') {
                onLineEnd = body => {
                  opt.onOrderedList(body.lastChild.lastChild.lastChild, 2)
                  opt.onOrderedList(body.lastChild, 1)
                }
              }
            }
          }
        }
      } else if (allowQuote
      && firstChar === '>') {
        if (next(1) === ' ') {
          if (body.lastChild == null
          || body.lastChild.tagName !== 'BLOCKQUOTE') {
            body.appendChild(document.createElement('BLOCKQUOTE'))
          }

          targetNode = body.lastChild
          lineCursor = 2
          lastFlushCursor = lineCursor

          if (opt.onQuote
          && nextRestText.startsWith('> ') === false) {
            onLineEnd = body => opt.onQuote(body.lastChild)
          }
        }
      } else if (allowMultilineCode
      && lineText.startsWith('```')) {
        const remainingText = text.substring(cursor + lineText.length + 1)
        const endTagIndex = remainingText.indexOf('```')

        if (endTagIndex > 0) {
          const content = remainingText.substring(0, endTagIndex - 1)
          const codeNode = document.createElement('CODE')
          codeNode.textContent = content

          const preNode = document.createElement('PRE')
          preNode.appendChild(codeNode)

          if (opt.onMultilineCode) {
            const language = text.substring(3, lineText.length)
            opt.onMultilineCode(preNode, language)
          }

          currentLine = preNode
          cursor += (lineText.length + 1 + endTagIndex)
          parseLine = false
        }
      }

      let lineCursorMax

      while (parseLine === true
      && lineCursor <= EOLIndex) {
        let ff = 0

        const match = TEXT_REGEX.exec(
          lineText.substring(lineCursor, lineCursorMax))

        if (match == null) {
          if (lineCursorMax == null) {
            lineCursor = lineText.length
            flush()
            break
          } else {
            lineCursor = lineCursorMax
            flush()
            lineCursor += currentLine.ffOnTextEnd
            lastFlushCursor += currentLine.ffOnTextEnd

            while (currentLine.upOnTextEnd) {
              currentLine = currentLine.parentNode
            }

            currentLine = currentLine.parentNode
            lineCursorMax = undefined
          }
        } else {
          const char = match[0]

          ff = 1
          lineCursor += match.index

          if (next(-1) === MARKDOWN_ESCAPE_CHAR) {
            // Do nothing
          } else if (char === '*') {
            if (next(1) === '*'
            && next(2) === '*') {
              const syntax = '***'
              const syntaxSize = syntax.length
              const fromIndex = lineCursor + syntaxSize
              const endTagIndex = lineText.substring(fromIndex).indexOf(syntax)

              if (endTagIndex > 0) {
                flush()
                lineCursorMax = fromIndex + endTagIndex

                const emNode = document.createElement('EM')
                emNode.ffOnTextEnd = syntaxSize
                emNode.upOnTextEnd = true

                const strongNode = document.createElement('STRONG')
                strongNode.appendChild(emNode)

                currentLine.appendChild(strongNode)
                currentLine = emNode


                ff = syntaxSize
                lastFlushCursor += syntaxSize
              }
            } else if (next(1) === '*') {
              const syntax = '**'
              const syntaxSize = 2
              const fromIndex = lineCursor + syntaxSize
              const endTagIndex = lineText.substring(fromIndex).indexOf(syntax)

              if (endTagIndex > 0) {
                flush()
                lineCursorMax = fromIndex + endTagIndex

                const strongNode = document.createElement('STRONG')
                strongNode.ffOnTextEnd = syntaxSize

                currentLine.appendChild(strongNode)
                currentLine = strongNode

                ff = syntaxSize
                lastFlushCursor += syntaxSize
              }
            } else {
              const syntaxSize = 1
              const fromIndex = lineCursor + syntaxSize
              const endTagIndex = lineText.substring(fromIndex).indexOf('*')

              if (endTagIndex > 0) {
                flush()
                lineCursorMax = fromIndex + endTagIndex

                const emNode = document.createElement('EM')
                emNode.ffOnTextEnd = syntaxSize

                currentLine.appendChild(emNode)
                currentLine = emNode

                ff = syntaxSize
                lastFlushCursor += syntaxSize
              }
            }
          } else if (char === '~') {
            if (next(1) === '~') {
              const syntax = '~~'
              const syntaxSize = syntax.length
              const fromIndex = lineCursor + syntaxSize
              const endTagIndex = lineText.substring(fromIndex).indexOf(syntax)

              if (endTagIndex > 0) {
                flush()
                lineCursorMax = fromIndex + endTagIndex

                const sNode = document.createElement('S')
                sNode.ffOnTextEnd = syntaxSize

                currentLine.appendChild(sNode)
                currentLine = sNode

                ff = syntaxSize
                lastFlushCursor += syntaxSize
              }
            }
          } else if (char === '^') {
            const syntax = '^'
            const syntaxSize = syntax.length
            const fromIndex = lineCursor + syntaxSize
            const endTagIndex = lineText.substring(fromIndex).indexOf(syntax)

            if (endTagIndex > 0) {
              flush()
              lineCursorMax = fromIndex + endTagIndex

              const supNode = document.createElement('SUP')
              supNode.ffOnTextEnd = syntaxSize

              currentLine.appendChild(supNode)
              currentLine = supNode

              ff = syntaxSize
              lastFlushCursor += syntaxSize
            }
          } else if (char === '[') {
            const restLineText = lineText.substring(lineCursor + 1)

            if (allowReference
            && next(1) === '^') {
              const refMatch = /\^(\d+)]/.exec(restLineText)

              if (refMatch) {
                const noteNb = refMatch[1]

                const supNode = document.createElement('SUP')
                supNode.textContent = noteNb

                const linkNode = document.createElement('A')
                linkNode.setAttribute('href', `#reference${noteNb}`)
                linkNode.appendChild(supNode)

                if (opt.onReference) {
                  opt.onReference(linkNode)
                }

                flush(linkNode)

                ff = (1 + refMatch[0].length)
                lastFlushCursor += ff
              }
            } else if (allowLink) {
              const endMatch = /([^\]]+)]\(([^)]+)\)/.exec(restLineText)

              if (endMatch) {
                const title = endMatch[1]
                const url = endMatch[2]

                const linkNode = document.createElement('A')
                linkNode.setAttribute('href', url)
                linkNode.textContent = title

                if (opt.onLink) {
                  opt.onLink(linkNode)
                }

                flush(linkNode)

                ff = (1 + endMatch[0].length)
                lastFlushCursor += ff
              }
            }
          } else if (char === '!'
          && next(1) === '[') {
            if (allowImage) {
              const restLineText = lineText.substring(lineCursor + 1)
              const endMatch = /^\[([^\]]+)]\(([^;)]+)\)({([^}]+)})?/
                .exec(restLineText)

              if (endMatch) {
                const syntaxSize = 1 + endMatch[0].length
                const title = endMatch[1]
                const url = endMatch[2]
                const style = endMatch[4]

                const imageNode = document.createElement('IMG')
                imageNode.setAttribute('src', url)
                imageNode.setAttribute('alt', title)

                if (allowImageStyle
                && style != null) {
                  imageNode.setAttribute('style', style)
                }

                if (opt.onImage) {
                  opt.onImage(imageNode, title, url)
                }

                flush(imageNode)

                ff = syntaxSize
                lastFlushCursor += ff
              }
            }
          } else if (allowCode
          && char === '`') {
            const restLineText = lineText.substring(lineCursor + 1)
            const endTagIndex = restLineText.indexOf('`')

            if (endTagIndex > 0) {
              const content = restLineText.substring(0, endTagIndex)
              const codeNode = document.createElement('CODE')
              codeNode.textContent = content

              if (opt.onCode) {
                opt.onCode(codeNode)
              }

              flush(codeNode)

              ff = (1 + endTagIndex + 1)
              lastFlushCursor += ff
            }
          }
        }

        lineCursor += ff
      }

      targetNode.appendChild(currentLine)

      if (onLineEnd) {
        onLineEnd(body)
      }
    }

    cursor += (EOLIndex + 1)
  }

  return body
}

module.exports.Element = Element
module.exports.parse = parse
