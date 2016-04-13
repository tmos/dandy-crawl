# Dandy Crawl

Crawl the interwebs like a real Dandy ಠ_ರೃ ! 

![npm version](https://nodei.co/npm/dandy-crawl.png)

A website crawler, that return every internal URLs with the associated HTTP status code. Returned data is an oriented graph, following this model :

```javascript
nodes: {
    values: [],
    lastNodeId: 0,
    push(currentUrl) {
        this.values.push({
            id: this.lastNodeId,
            url: currentUrl,
            isExplored: false,
        });
        this.lastNodeId++;
    },
    get(currentUrl) {
        return this.values.filter(function (node) {
            return node.url === currentUrl;
        })[0]
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
        this.lastEdgeId++;
    },
    get(from, to) {
        return this.values.filter(function (edge) {
            return edge.from === from && edge.to === to;
        })[0]
    },
}
```

## Usage

```javascript
if (!process.argv[2]) {
    throw "Argument 1 should be an url";
}

const mod = require('./'),
      url = process.argv[2];

mod.exploreDomain(url)
  .then(function (data) {
    console.log(data.nodes.values);
    console.log(data.edges.values);
  })
  .catch(function(e){
    console.log(e);
  });
```