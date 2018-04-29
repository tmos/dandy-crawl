import test from 'ava';
import DandyCrawl from './../dist';

const url = 'http://127.0.0.1:8080/';


test('Crawls good', async (t) => {
  const dandee = new DandyCrawl(url);
  const data = await dandee.exploreDomain();
  const nodes = data.nodes.values;

  t.is(nodes.length, 3);
});

test('Sitemap parsing works', async (t) => {
  const dandee = new DandyCrawl(url);
  const data = await dandee.getSitemapUrls();
  const nodes = data.nodes.values;

  t.is(nodes.length, 4);
});

test('Can crawl AND get sitemap', async (t) => {
  const dandee = new DandyCrawl(url);
  const data = await dandee.crawl();
  const nodes = data.nodes.values;

  t.is(nodes.length, 5);
});

test('Can get URLs just from the sitemap', async (t) => {
  const dandee = new DandyCrawl('http://127.0.0.1:8080/');
  const data = await dandee.getSitemapUrls('http://127.0.0.1:8080/sitemap.xml');
  const nodes = data.nodes.values;

  t.is(nodes.length, 4);
});
