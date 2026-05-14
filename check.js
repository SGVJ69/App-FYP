const https = require('https');
https.get(process.argv[2], (res) => {
  console.log(res.statusCode);
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
     console.log('Redirect: ' + res.headers.location);
  }
}).on('error', (e) => {
  console.error(e);
});
