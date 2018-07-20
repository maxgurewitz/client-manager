import buildServer from  '../../src/server/buildServer';
import * as Hapi from 'hapi';

let server : Hapi.Server;

beforeAll(async () => {
  server = await buildServer({});
  return server.start();
});

afterAll(async () => {
  return server.stop();
});

test('login without token gives 401', () => {
  expect('foo').toEqual('bar');
});
