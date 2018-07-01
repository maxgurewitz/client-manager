import * as Hapi from 'hapi';
import _ from 'lodash';
import Bluebird from 'bluebird';

export default async function buildServer({ port } : { port?: number }): Bluebird<Hapi.Server> {
  const server = new Hapi.Server({
      port: port || 3000,
      host: '0.0.0.0'
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
        return 'Hello, world!';
    }
  });

  server.route({
    method: 'GET',
    path: '/.well-known/acme-challenge/{content}',
    handler: (request, h) => {
      return _.get(request, 'params.content', 'empty');
    }
  });

  return server;
}
