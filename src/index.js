import cheerio from 'cheerio';
import got from 'got';
import validUrl from 'valid-url';
import _ from 'lodash';
import Sitemapper from 'sitemapper';

class DandyCrawl {
  constructor(url) {
    this.tree = {
      nodes: {
        values: [],
        lastNodeId: 0,
        push(currentUrl) {
          const newNode = {
            id: this.lastNodeId,
            url: currentUrl,
            isExplored: false,
          };
          this.values.push(newNode);
          this.lastNodeId += 1;
        },
        get(currentUrl) {
          return this.values.filter(node => node.url === currentUrl)[0];
        },
      },
      concat(newData) {
        const newConcatValues = _.uniq(this.nodes.values.concat(newData.nodes.values));
        this.nodes.values = newConcatValues;
        return this;
      },
    };

    // TODO : verify the status code of the homepage
    if (!validUrl.isUri(url)) {
      throw new Error('Please, set a valid url');
    }

    this.seedUrl = url;
    this.tree.nodes.push(url);
  }

  formatUrls(link) {
    let url = link;

    if (!validUrl.is_uri(url)) {
      url = `${this.seedUrl}/${link}`;
    }

    return url;
  }

  linkFiltering(link) {
    return (
      validUrl.isUri(link) && // is a proper URL
      link.indexOf('#') === -1 && // is not an anchor
      link.indexOf('.pdf') === -1 && // is not a pdf
      link.indexOf('.jpg') === -1 && // is not a jpg
      link.indexOf('.png') === -1 && // is not a png
      link.search(this.seedUrl) === 0
    ); // is in the same domain
  }

  linkFilteringStrict(link) {
    // We don't want a link that is already saved
    return this.linkFiltering(link) && this.tree.nodes.get(link) === undefined;
  }

  linksOfThePage(url) {
    return got(url)
      .then((res) => {
        this.tree.nodes.get(url).statusCode = res.statusCode;

        const $ = cheerio.load(res.body);
        return _.map($('a'), a => a.attribs.href);
      })
      .catch((e) => {
        throw new Error(e);
      });
  }

  recursive(pageParente) {
    const self = this;
    const { tree } = this;

    if (tree.nodes.get(pageParente).isExplored === true) {
      return Promise.resolve();
    }

    // Set it as crawled
    tree.nodes.get(pageParente).isExplored = true;

    return (
      this.linksOfThePage(pageParente)
        .then(rawlinksOfTheParentPage => _.uniq(rawlinksOfTheParentPage))
        .then(linksOfThePage =>
          linksOfThePage.map(link => this.formatUrls(link)))
        .then(validLinks => validLinks.filter(self.linkFiltering, self))
        // Next line : too much magic 🦄⭐️⭐️ what it do? mystery
        .then(internalLinks =>
          internalLinks.filter(self.linkFilteringStrict, self))
        .then(urls =>
          Promise.all(urls.map((currentUrl) => {
            const nodeChild = tree.nodes.get(currentUrl);

            if (nodeChild && nodeChild.isExplored === true) {
              return Promise.resolve();
            }
            tree.nodes.push(currentUrl);
            return this.recursive(currentUrl);
          })))
        .catch((e) => {
          console.log(e);
        })
    );
  }

  getSitemapUrls(stmp) {
    const self = this;
    const sitemapUrl = stmp || `${self.seedUrl}sitemap.xml`;

    return new Promise((resolve, reject) => {
      const sitemap = new Sitemapper();

      sitemap.timeout = 5000;
      return sitemap
        .fetch(sitemapUrl)
        .then((data) => {
          data.sites.map((url) => {
            if (!this.tree.nodes.get(url)) {
              this.tree.nodes.push(url);
            }
            return true;
          }, self);
          return self.tree;
        })
        .then(tree => resolve(tree))
        .catch((error) => {
          reject(new Error(error));
        });
    });
  }

  exploreDomain() {
    const self = this;
    return new Promise((resolve, reject) => {
      this.recursive(this.seedUrl)
        .then(() => {
          resolve(self.tree);
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  async crawl() {
    const self = this;

    const sitemapUrl = await self.getSitemapUrls();
    const exploredData = await self.exploreDomain();
    const concatenated = sitemapUrl.concat(exploredData);

    return concatenated;
  }
}

export default DandyCrawl;
