import https from "https";
https.get("https://loremflickr.com/600/400/kadazan,traditional/all", (res) => {
  console.log(res.statusCode);
  console.log(res.headers.location);
});
