import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = 'C:\\Users\\diyaz\\.gemini\\antigravity\\brain\\6edab494-74e7-4218-865a-0696fb1608a5\\media__1783221805652.png';
const yayasanPath = path.join(__dirname, 'public', 'logo-yayasan.png');
const smpPath = path.join(__dirname, 'public', 'logo-smp.png');

async function processImages() {
  try {
    const metadata = await sharp(srcPath).metadata();
    
    // We need to capture the full logos without clipping them.
    // The previous 150x160 clipped the edges. Let's use 190x200.
    // Left Logo (Yayasan)
    await sharp(srcPath)
      .extract({ left: 15, top: 20, width: 200, height: 210 })
      .toFile(yayasanPath);
    console.log('Yayasan logo saved');
    
    // Right Logo (SMP)
    await sharp(srcPath)
      .extract({ left: metadata.width - 215, top: 20, width: 200, height: 210 })
      .toFile(smpPath);
    console.log('SMP logo saved');
    
  } catch (err) {
    console.error(err);
  }
}

processImages();
