/**
 * Copyright (c) 2016 "Dandy SEO"
 * https://github.com/dandy-seo
 * Released under the GNU GPL 3.0
 */

if (!process.argv[2]) {
    throw "Argument 1 should be an url";
}

const mod = require('./'),
  url = process.argv[2]

mod.exploreDomain(url)
  .then(function (data) {
    console.log('\n exploreDomain :')
    console.log(data.nodes.values)
    console.log(data.edges.values)
  })
  .catch(console.log.bind(console))
