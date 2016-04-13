/**
 * Copyright (c) 2016 "Dandy SEO"
 * https://github.com/dandy-seo
 * Released under the GNU GPL 3.0
 */
 
'use strict'

const cheerio = require('cheerio'),
    rp = require('request-promise'),
    validUrl = require('valid-url'),
    _ = require('lodash'),
    crawl = {},
    tree = {
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
            },
        };

        function linkFiltering(link) {
            let res = false;

            if (validUrl.isUri(link) &&                         // is a proper URL
                link.indexOf('#') === -1 &&                     // is not an anchor
                link.indexOf('.pdf') === -1 &&                  // is not a pdf
                link.indexOf('.jpg') === -1 &&                  // is not a jpg
                link.indexOf('.png') === -1 &&                  // is not a png
                link.search(tree.nodes.values[0].url) === 0) {  // is in the same domain
                res = true;
            }

            return res;
        }

        function linkFilteringStrict(link) {
            let res = false;

            if (validUrl.isUri(link) &&                         // is a proper URL
                link.indexOf('#') === -1 &&                     // is not an anchor
                link.indexOf('.pdf') === -1 &&                  // is not a pdf
                link.indexOf('.jpg') === -1 &&                  // is not a jpg
                link.indexOf('.png') === -1 &&                  // is not a png
                link.search(tree.nodes.values[0].url) === 0 &&  // is in the same domain
                tree.nodes.get(link) === undefined) {           // not in already saved
                res = true;
            }

            return res;
        }

        function linksOfThePage(url) {
            const options = {
                method: 'GET',
                uri: url,
                resolveWithFullResponse: true,
                simple: false,
            };

            return rp(options)
                .then(function (res) {
                    tree.nodes.get(url).statusCode = res.statusCode;

                    let $ = cheerio.load(res.body);
                    return _.map($('a'), function (a) {
                        return a.attribs.href;
                    })
                })
                .catch(function (e) {
                    throw new Error(e);
                })
        }

        function recursive(pageParente) {
            if (tree.nodes.get(pageParente).isExplored === true) {
                return Promise.resolve();
            }

            // Set it as crawled
            tree.nodes.get(pageParente).isExplored = true;

            return linksOfThePage(pageParente)
                .then(function unification(childrenRaw) {
                    return _.uniq(childrenRaw);
                })
                .then(function filterLinks(uniqChildren) {
                    // First time we find a link to this page
                    const processedUniqChildren = uniqChildren.filter(linkFiltering);

                    processedUniqChildren.map(function (currentUrl) {
                        if (tree.edges.get(pageParente, currentUrl) === undefined) {
                            tree.edges.push(pageParente, currentUrl);
                        }
                    })
                    return processedUniqChildren.filter(linkFilteringStrict);
                })
                .then(function final(urls) {
                    return Promise.all(urls.map(function (currentUrl) {
                        const nodeChild = tree.nodes.get(currentUrl);

                        if (nodeChild && nodeChild.isExplored === true) {
                            // We already know this page, but this is a new edge
                            tree.edges.push(pageParente, currentUrl);
                            return Promise.resolve();
                        } else {
                            tree.nodes.push(currentUrl);
                            return recursive(currentUrl);
                        }
                    }))
                })
                .catch(function (e) {
                    console.log(e);
                })
        }

/**
 * Explore all the linked pages from a domain
 *
 * @param    {<string>}  url   the domain you want to explore
 */
crawl.exploreDomain = function (url) {
    return new Promise(function (resolve, reject) {
        // TODO : verify the status code of the homepage
        if (!validUrl.isUri(url)) {
            reject("Please, set a valid url");
        }

        tree.nodes.push(url)

        recursive(url)
            .then(function () {
                resolve(tree);
            })
            .catch(function (e) {
                reject(e);
            })
    })
}

module.exports = crawl
