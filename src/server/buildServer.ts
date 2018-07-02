import * as Hapi from 'hapi';
import * as _ from 'lodash';
import Bluebird from 'bluebird';
import * as vision from 'vision';
import * as pug from 'pug';
import * as inert from 'inert';
import * as path from 'path';

export default async function buildServer({ port } : { port?: number }): Bluebird<Hapi.Server> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const server = new Hapi.Server({
      port: port || 3000,
      host: '0.0.0.0',
      routes: {
        files: {
          relativeTo: path.join(__dirname, '..', '..', 'dist')
        }
      }
  });

  await server.register([
    inert
    // vision
  ]);

  server.route({
    method: 'GET',
    path: '/public/{param*}',
    handler: {
      directory: {
        path: path.join(__dirname, '..', '..', 'dist')
      }
    }
  });

  server.route({
    method: 'GET',
    path: '/{path*}',
    options: {
      auth: false
    },
    handler: function (request, h) {
      return h.file(path.join('html', `index.${process.env.NODE_ENV}.html`));
    }
  });

  return server;
}
