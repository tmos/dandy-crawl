import test from 'ava';
import DandyCrawl from './../dist';

const url = 'http://127.0.0.1:8080';
const dandee = new DandyCrawl();

test('foo', async (t) => {
  const data = await dandee.exploreDomain(url);
  const nodes = data.nodes.values;

  console.log(nodes);

  t.is(nodes.length, 2);
});
