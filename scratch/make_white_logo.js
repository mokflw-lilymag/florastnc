const sharp = require('sharp');

async function processLogo() {
  const input = 'public/floxync-logo.png';
  const outputWhite = 'public/images/floxync-logo-white.png';
  
  // We need to change the dark text to white.
  // The dark text is probably near-black (e.g., #111 or #000).
  // The X is green.
  // If we just invert, the green X becomes magenta.
  // So we need to selectively replace dark pixels with white pixels.
  
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // If it's a dark pixel (r, g, b all low, say < 100) and not fully transparent
    // Let's make it white.
    if (a > 0 && r < 80 && g < 80 && b < 80) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(outputWhite);

  console.log('Successfully created white version of the definitive logo.');
}

processLogo().catch(console.error);
