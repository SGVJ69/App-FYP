import https from "https";

const options = {
  hostname: 'en.wikipedia.org',
  path: '/w/api.php?action=query&prop=images&format=json&titles=Kadazan_people',
  method: 'GET',
  headers: {
    'User-Agent': 'Bot/1.0'
  }
};

https.get(options, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    const parsed = JSON.parse(body);
    const pages = parsed.query?.pages;
    if (!pages) return console.log('no pages');
    const page = Object.values(pages)[0];
    const titles = page.images.map(img => img.title);
    
    titles.forEach(imgTitle => {
      const titleEnc = encodeURIComponent(imgTitle);
      const url2 = `/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=${titleEnc}`;
      https.get({hostname: 'en.wikipedia.org', path: url2, headers: {'User-Agent': 'Bot/1.0'}}, (res2) => {
        let body2 = "";
        res2.on("data", (chunk) => body2 += chunk);
        res2.on("end", () => {
          const parsed2 = JSON.parse(body2);
          const pages2 = parsed2.query?.pages;
          if(pages2) {
              const info = Object.values(pages2)[0].imageinfo?.[0];
              if (info && info.url && /\.(jpg|png|jpeg)$/i.test(info.url)) {
                console.log(info.url);
              }
          }
        });
      });
    });
  });
});
