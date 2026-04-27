const sharp = require('sharp');

async function processImage() {
  const input = 'public/images/floxync-logo-white.png';
  const metadata = await sharp(input).metadata();
  
  // Crop the center portion. 
  // We want to avoid the bottom text. Let's crop width: 350, height: 300 from center-ish.
  const width = 350;
  const height = 300;
  const left = Math.floor((metadata.width - width) / 2);
  const top = 10; // offset a bit from top to avoid bottom text

  await sharp(input)
    .extract({ left, top, width, height })
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent
    })
    .toFile('src/app/icon.png');
    
  console.log('Successfully created icon.png');
}

processImage().catch(console.error);
