import * as Hapi from 'hapi';
import Bluebird from 'bluebird';

export default async function buildServer({ port } : { port?: number }): Bluebird<Hapi.Server> {
  const server = new Hapi.Server({
      port: port || 3000,
      host: 'localhost'
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        return 'Hello, world!';
    }
  });

  return server;
}
