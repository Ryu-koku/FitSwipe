// Rebuild platform sizes from the approved artwork and imagegen adaptations.
// Uses the image library already installed with Expo; no extra dependency.
const path = require('node:path');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '..');
const mobileRequire = createRequire(path.join(root, 'mobile/package.json'));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const imageRequire = createRequire(expoRequire.resolve('@expo/image-utils'));
const Jimp = imageRequire('jimp-compact');
const source = path.join(root, 'design/app-icon');
const output = path.join(root, 'mobile/assets');
const size = 1024;
const background = 0x006d67ff;

// Background extraction may leave disconnected alpha specks outside the mark.
// Retain its main connected shape without modifying its colors or interior.
function keepMainShape(image) {
  const { data, width, height } = image.bitmap;
  const visited = new Uint8Array(width * height);
  const queue = new Uint32Array(width * height);
  let main = new Uint32Array();
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || data[start * 4 + 3] < 128) continue;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    visited[start] = 1;
    while (head < tail) {
      const pixel = queue[head++];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const neighbor = ny * width + nx;
          if (visited[neighbor] || data[neighbor * 4 + 3] < 128) continue;
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }
    if (tail > main.length) main = queue.slice(0, tail);
  }
  const keep = new Uint8Array(width * height);
  for (const pixel of main) keep[pixel] = 1;
  for (let pixel = 0; pixel < keep.length; pixel++) {
    if (!keep[pixel]) data[pixel * 4 + 3] = 0;
  }
  if (main.length < width * height * 0.1) throw new Error('Foreground mark is missing');
  return image;
}

function radius(image) {
  const { data, width, height } = image.bitmap;
  let result = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= 128) {
        result = Math.max(result, Math.hypot(x + 0.5 - width / 2, y + 0.5 - height / 2));
      }
    }
  }
  return result;
}

async function main() {
  const approved = await Jimp.read(path.join(source, 'approved.png'));
  await approved.clone().resize(size, size, Jimp.RESIZE_BICUBIC)
    .rgba(false).writeAsync(path.join(output, 'icon.png'));
  await approved.clone().resize(48, 48, Jimp.RESIZE_BICUBIC)
    .rgba(false).writeAsync(path.join(output, 'favicon.png'));

  const foreground = keepMainShape(await Jimp.read(path.join(source, 'android-foreground-source.png')));
  const monochrome = await Jimp.read(path.join(source, 'android-monochrome-mask.png'));
  monochrome.scan(0, 0, monochrome.bitmap.width, monochrome.bitmap.height, function (x, y, index) {
    const pixels = this.bitmap.data;
    const luminance = (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    // The generated white-on-black stencil becomes white ink with alpha holes.
    pixels[index + 3] = Math.round(Math.max(0, Math.min(255, (luminance - 16) * 255 / 223)));
    pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
  });
  const normalized = [foreground, monochrome].map(image =>
    image.resize(size, size, Jimp.RESIZE_BICUBIC));
  // A 64dp diameter fits inside Android's central 66dp safe region on a 108dp layer.
  const extent = Math.max(...normalized.map(radius));
  const layerSize = Math.floor(size * Math.min(1, (size * 32 / 108) / extent));
  for (const [index, name] of ['android-icon-foreground.png', 'android-icon-monochrome.png'].entries()) {
    const mark = normalized[index].resize(layerSize, layerSize, Jimp.RESIZE_BICUBIC);
    const offset = Math.floor((size - layerSize) / 2);
    const layer = new Jimp(size, size, 0x00000000).composite(mark, offset, offset);
    await layer.writeAsync(path.join(output, name));
  }
  await new Jimp(size, size, background).rgba(false)
    .writeAsync(path.join(output, 'android-icon-background.png'));
  console.log('Wrote app icon, favicon, and Android color/background/monochrome layers.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
