import cheerio from 'cheerio';
import rp from 'request-promise';
import validUrl from 'valid-url';
import _ from 'lodash';

class DandyCrawl {
  constructor(url) {
    this.tree = {
      nodes: {
        values: [],
        lastNodeId: 0,
        push(currentUrl) {
          this.values.push({
            id: this.lastNodeId,
            url: currentUrl,
            isExplored: false,
          });
          this.lastNodeId += 1;
        },
        get(currentUrl) {
          return this.values.filter(node => node.url === currentUrl)[0];
        },
      },
      edges: {
        values: [],
        lastEdgeId: 0,
        push(from, to) {
          this.values.push({
            id: this.lastEdgeId,
            from,
            to,
          });
          this.lastEdgeId += 1;
        },
        get(from, to) {
          return this.values.filter(edge => edge.from === from && edge.to === to)[0];
        },
      },
    };

    // TODO : verify the status code of the homepage
    if (!validUrl.isUri(url)) {
      throw new Error('Please, set a valid url');
    }

    this.seedUrl = url;
    this.tree.nodes.push(url);
  }

  linkFiltering(link) {
    let res = false;
    const url = link;

    if (validUrl.isUri(link) && // is a proper URL
      url.indexOf('#') === -1 && // is not an anchor
      url.indexOf('.pdf') === -1 && // is not a pdf
      url.indexOf('.jpg') === -1 && // is not a jpg
      url.indexOf('.png') === -1 && // is not a png
      url.search(this.seedUrl) === 0 // is in the same domain
    ) {
      res = true;
    }

    return res;
  }

  linkFilteringStrict(link) {
    const { tree } = this;
    let res = false;
    const url = link;

    if (
      this.linkFiltering(url) &&
      tree.nodes.get(url) === undefined // not in already saved
    ) {
      res = true;
    }

    return res;
  }

  linksOfThePage(url) {
    const options = {
      method: 'GET',
      uri: url,
      resolveWithFullResponse: true,
      simple: false,
    };

    return rp(options)
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

    return this.linksOfThePage(pageParente)
      .then(rawlinksOfTheParentPage => _.uniq(rawlinksOfTheParentPage))
      .then((linksOfThePage) => {
        // First time we find a link to this page
        const processedUniqChildren = linksOfThePage.filter(self.linkFiltering, self);

        processedUniqChildren.map((currentUrl) => {
          if (tree.edges.get(pageParente, currentUrl) === undefined) {
            tree.edges.push(pageParente, currentUrl);
          }
          return true;
        });
        return processedUniqChildren.filter(self.linkFilteringStrict, self);
      })
      .then(urls => Promise.all(urls.map((currentUrl) => {
        const nodeChild = tree.nodes.get(currentUrl);

        if (nodeChild && nodeChild.isExplored === true) {
          // We already know this page, but this is a new edge
          tree.edges.push(pageParente, currentUrl);
          return Promise.resolve();
        }
        tree.nodes.push(currentUrl);
        return this.recursive(currentUrl);
      })))
      .catch((e) => {
        console.log(e);
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
}

export default DandyCrawl;
