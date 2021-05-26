const { Crawler } = require('./crawler');

(async () => {
  const crawler = new Crawler();
  crawler.saveJSON();
})();