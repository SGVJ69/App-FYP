import fs from 'fs';
import https from 'https';
import path from 'path';

const imagesToDownload = [
  { name: 'grandparents.jpg', url: 'https://loremflickr.com/600/400/people,elderly' },
  { name: 'siblings.jpg', url: 'https://loremflickr.com/600/400/children,siblings' },
  { name: 'mother.jpg', url: 'https://loremflickr.com/600/400/mother,portrait' },
  { name: 'father.jpg', url: 'https://loremflickr.com/600/400/father,portrait' },
  { name: 'tombolog.jpg', url: 'https://loremflickr.com/600/400/bird' },
  { name: 'child.jpg', url: 'https://loremflickr.com/600/400/child' }
];

const publicImagesDir = path.resolve('public/images');
if (!fs.existsSync(publicImagesDir)) {
  fs.mkdirSync(publicImagesDir, { recursive: true });
}

async function downloadImage(img) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(publicImagesDir, img.name);
    const downloadRedirect = (urlUrl) => {
      let finalUrl = urlUrl;
      if (finalUrl.startsWith('/')) {
         finalUrl = 'https://loremflickr.com' + finalUrl;
      }
      https.get(finalUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return downloadRedirect(res.headers.location);
        }
        res.pipe(fs.createWriteStream(filePath))
           .on('finish', resolve)
           .on('error', reject);
      }).on('error', reject);
    };
    downloadRedirect(img.url);
  });
}

(async () => {
  for (const img of imagesToDownload) {
    console.log('Downloading', img.name);
    await downloadImage(img);
  }
  console.log('Done downloading images.');
})();
