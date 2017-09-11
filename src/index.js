import cheerio from 'cheerio';
import rp from 'request-promise';
import validUrl from 'valid-url';
import _ from 'lodash';

class DandyCrawl {
  constructor() {
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
  }

  linkFiltering(link) {
    const { tree } = this;
    let res = false;

    if (
      validUrl.isUri(link) && // is a proper URL
      link.indexOf('#') === -1 && // is not an anchor
      link.indexOf('.pdf') === -1 && // is not a pdf
      link.indexOf('.jpg') === -1 && // is not a jpg
      link.indexOf('.png') === -1 && // is not a png
      link.search(tree.nodes.values[0].url) === 0 // is in the same domain
    ) {
      res = true;
    }

    return res;
  }

  linkFilteringStrict(link) {
    const { tree } = this;
    let res = false;

    if (
      validUrl.isUri(link) && // is a proper URL
      link.indexOf('#') === -1 && // is not an anchor
      link.indexOf('.pdf') === -1 && // is not a pdf
      link.indexOf('.jpg') === -1 && // is not a jpg
      link.indexOf('.png') === -1 && // is not a png
      link.search(tree.nodes.values[0].url) === 0 && // is in the same domain
      tree.nodes.get(link) === undefined // not in already saved
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
      .then(childrenRaw => _.uniq(childrenRaw))
      .then((uniqChildren) => {
        // First time we find a link to this page
        const processedUniqChildren = uniqChildren.filter(self.linkFiltering, self);

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

  exploreDomain(url) {
    const self = this;
    return new Promise((resolve, reject) => {
      // TODO : verify the status code of the homepage
      if (!validUrl.isUri(url)) {
        reject(new Error('Please, set a valid url'));
      }

      this.tree.nodes.push(url);

      this.recursive(url)
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
