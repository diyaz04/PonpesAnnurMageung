const Jimp = require('jimp');
const path = require('path');

const srcPath = 'C:\\Users\\diyaz\\.gemini\\antigravity\\brain\\6edab494-74e7-4218-865a-0696fb1608a5\\media__1783220605739.png';
const yayasanPath = path.join(__dirname, 'public', 'logo-yayasan.png');
const smpPath = path.join(__dirname, 'public', 'logo-smp.png');

async function processImages() {
  try {
    console.log("Reading image...");
    const image = await Jimp.read(srcPath);
    console.log("Original Image Size:", image.bitmap.width, "x", image.bitmap.height);
    
    // We want to crop the left logo and right logo.
    // Based on the Kop Surat aspect ratio, it's roughly 800px wide.
    // Left logo: Yayasan An-Nur (Approx x: 20 to 180, y: 10 to 180)
    // Right logo: SMP Maarif (Approx x: 620 to 780, y: 10 to 180)
    
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    
    // The logo sizes depend on the image size. The height of the kop is probably the full height of the image since it's a cropped screenshot.
    // Let's assume height is around H. The logos occupy roughly H x H.
    
    // Yayasan Logo (Left)
    // Crop arguments: x, y, w, h
    const logoY = image.clone().crop(10, 10, h - 20, h - 20);
    // Find exact bounding box to make it tighter?
    // Just save it for now.
    logoY.write(yayasanPath, () => { console.log('Yayasan logo saved'); });
    
    // SMP Logo (Right)
    const logoS = image.clone().crop(w - h + 10, 10, h - 20, h - 20);
    logoS.write(smpPath, () => { console.log('SMP logo saved'); });
    
  } catch (err) {
    console.error(err);
  }
}

processImages();
