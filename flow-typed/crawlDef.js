// @flow

type Node = {
  values: [],
  lastNodeId: number,
  push: () => mixed,
  get: () => mixed,
}

type Edge = {
  values: [],
  lastEdgeId: 0,
  push: () => mixed,
  get: () => mixed,
}

declare type Crawl = {
    nodes: Node,
    edges: Edge,
}

declare interface DandyCrawl {
  constructor(url: string): DandyCrawl;
  exploreDomain(): Crawl;
}
