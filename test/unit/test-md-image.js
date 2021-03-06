'use strict'
/* eslint-disable prefer-arrow-callback */

const {
  parse,
  parseToHtml,
  inlineHtml,
  test,
} = require('../test-lib.js')

test('Image on its own line with an alt text', function (t) {
  const input = '![alt text](https://example.com/image)'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="alt text">
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line with an empty alt text', function (t) {
  const input = '![](https://example.com/image)'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="">
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line with an alt text and a title', function (t) {
  const input = '![alt text](https://example.com/image "My image title")'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="alt text">
      <figcaption>My image title</figcaption>
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line with an empty alt text and a title', function (t) {
  const input = '![alt text](https://example.com/image "My image title")'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="alt text">
      <figcaption>My image title</figcaption>
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line with an empty title', function (t) {
  const input = '![](https://example.com/image "")'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="">
      <figcaption></figcaption>
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line surrounded by elements', function (t) {
  const input = `
    - List 1
    ![alt text](https://example.com/image)
    - List 2`

  const output = inlineHtml`
    <ul>
      <li>List 1</li>
    </ul>
    <figure>
      <img src="https://example.com/image" alt="alt text">
    </figure>
    <ul>
      <li>List 2</li>
    </ul>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line can NOT have html attr by default', function (t) {
  const input = '![alt text](https://example.com/image){style=height:100px}'
  const output = inlineHtml`
    <figure>
      <img src="https://example.com/image" alt="alt text">
    </figure>`

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image on its own line CAN have html attr if allowHTMLAttributes is true', function (t) {
  const input = '![alt text](https://example.com/image){style=height:100px}'
  const output = inlineHtml`
    <figure style="height:100px">
      <img src="https://example.com/image" alt="alt text">
    </figure>`
  const opt = {
    allowHTMLAttributes: true,
  }

  t.equal(parseToHtml(input, opt), output, 'Output is valid')
  t.end()
})

test('Image on its own line with callback', function (t) {
  const input = '![alt text](https://example.com/image)'
  const opt = {
    onImage: node => {
      t.notEqual(node, null, 'Parameter is populated')
      t.equal(node.tagName, 'IMG', 'Tagname is valid')
      t.end()
    },
  }

  parse(input, opt)
})

test('Image inline', function (t) {
  const input = 'This is an inline ![alt text](https://example.com/image)'
  const output = '<p>This is an inline <img src="https://example.com/image" alt="alt text"></p>'

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image inline at the beginning of line', function (t) {
  const input = '![alt text](https://example.com/image) was inlined'
  const output = '<p><img src="https://example.com/image" alt="alt text"> was inlined</p>'

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image with style and default allowHTMLAttributes', function (t) {
  const input = 'This is an inline ![alt text](https://example.com/image){style=height: 100px}'
  const output = '<p>This is an inline <img src="https://example.com/image" alt="alt text"></p>'

  t.equal(parseToHtml(input), output, 'Output is valid')
  t.end()
})

test('Image with style and allowHTMLAttributes to true', function (t) {
  const input = 'This is an inline ![alt text](https://example.com/image){style="height: 100px; width: 50px"} with style'
  const output = '<p>This is an inline <img src="https://example.com/image" alt="alt text" style="height: 100px; width: 50px"> with style</p>'
  const opt = {
    allowHTMLAttributes: true,
  }

  t.equal(parseToHtml(input, opt), output, 'Output is valid')
  t.end()
})

test('Image inline with callback', function (t) {
  const input = 'This is an inline ![alt text](https://example.com/image)'
  const opt = {
    onImage: node => {
      t.notEqual(node, null, 'Parameter is populated')
      t.equal(node.tagName, 'IMG', 'Tagname is valid')
      t.end()
    },
  }

  parse(input, opt)
})
