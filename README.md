# Dandy Crawl

Crawl the interwebs like a real Dandy ಠ_ರೃ !

![npm version](https://nodei.co/npm/dandy-crawl.png)

A website crawler, that return every internal URLs with the associated HTTP status code. Returned data is an oriented graph, following this model :

```javascript
nodes: {
    values: [],
    lastNodeId: 0,
    get(currentUrl) {
        return this.values.filter(function (node) {
            return node.url === currentUrl;
        })[0]
    }
},
edges: {
    values: [],
    lastEdgeId: 0,
    get(from, to) {
        return this.values.filter(function (edge) {
            return edge.from === from && edge.to === to;
        })[0]
    }
}
```

## Usage

```javascript
import DandyCrawl from 'dandy-crawl';

const dandee = new DandyCrawl(http://127.0.0.1:8080);

dandee.exploreDomain().then(data => {
  console.log(data);
});
```
