import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { deflateSync } from 'node:zlib'

const target = resolve(new URL('../icons/', import.meta.url).pathname)
mkdirSync(target, { recursive: true })

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function makeIcon(size) {
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  const radius = size * .23
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1); pixels[row] = 0
    for (let x = 0; x < size; x += 1) {
      const index = row + 1 + x * 4
      const edgeX = Math.min(x, size - 1 - x), edgeY = Math.min(y, size - 1 - y)
      const outside = Math.max(0, radius - Math.min(edgeX, edgeY))
      const corner = (x < radius && y < radius) || (x > size - radius - 1 && y < radius) || (x < radius && y > size - radius - 1) || (x > size - radius - 1 && y > size - radius - 1)
      const centerX = x < radius ? radius : x > size - radius - 1 ? size - radius - 1 : x
      const centerY = y < radius ? radius : y > size - radius - 1 ? size - radius - 1 : y
      const inside = !corner || Math.hypot(x - centerX, y - centerY) <= radius
      if (inside) { pixels[index] = 52; pixels[index + 1] = 88; pixels[index + 2] = 219; pixels[index + 3] = 255 }
      const dx = x - size / 2, dy = y - size / 2
      const ring = Math.abs(Math.hypot(dx, dy) - size * .18) < Math.max(1, size * .045)
      const diagonal = (Math.abs(dx - dy) < Math.max(1, size * .055) || Math.abs(dx + dy) < Math.max(1, size * .055)) && Math.hypot(dx, dy) < size * .29
      if (inside && (ring || diagonal)) { pixels[index] = 244; pixels[index + 1] = 247; pixels[index + 2] = 255; pixels[index + 3] = 255 }
      void outside
    }
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
}

for (const size of [16, 32, 48, 128]) writeFileSync(resolve(target, `icon-${size}.png`), makeIcon(size))
console.log('Extension icons generated')
