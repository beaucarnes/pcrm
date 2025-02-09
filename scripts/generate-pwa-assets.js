const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Base icon (you'll need to provide this)
const SOURCE_ICON = path.join(PUBLIC_DIR, 'app-icon.png');

// Icon sizes needed for PWA and favicons
const SIZES = {
  favicons: [16, 32, 48],
  pwa: [192, 384, 512]
};

async function generateIcons() {
  try {
    // Generate PWA icons
    for (const size of SIZES.pwa) {
      await sharp(SOURCE_ICON)
        .resize(size, size)
        .toFile(path.join(ICONS_DIR, `icon-${size}x${size}.png`));
      
      console.log(`Generated PWA icon ${size}x${size}`);
    }

    // Generate favicons
    const faviconBuffers = await Promise.all(
      SIZES.favicons.map(size => 
        sharp(SOURCE_ICON)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // Save individual PNG favicons
    for (let i = 0; i < SIZES.favicons.length; i++) {
      const size = SIZES.favicons[i];
      await fs.promises.writeFile(
        path.join(PUBLIC_DIR, `favicon-${size}x${size}.png`),
        faviconBuffers[i]
      );
      console.log(`Generated favicon ${size}x${size}`);
    }

    // Generate favicon.ico from the buffers
    const icoBuffer = await toIco(faviconBuffers);
    await fs.promises.writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
    console.log('Generated favicon.ico');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1); // Exit with error code
  }
}

generateIcons(); 