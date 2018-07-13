import * as Hapi from 'hapi';
import * as _ from 'lodash';
import Bluebird from 'bluebird';
import * as inert from 'inert';
import * as path from 'path';

const Sequelize = require('sequelize');

export default async function buildServer({ port, databaseUrl } : { port?: number, databaseUrl?: string }): Bluebird<Hapi.Server> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const sequelize = new Sequelize('client-manager', null, null, {
    host: databaseUrl || 'localhost',
    dialectOptions: {
      ssl: process.env.NODE_ENV !== 'development',
    },
    dialect: 'postgres',
    operatorsAliases: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

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
  ]);

  server.route({
    method: 'GET',
    path: '/api/authenticate',
    options: {
      auth: false
    },
    handler: function (request, h) {
      const bearer = request.headers.bearer;
      return { projectId: 'api' };
    }
  });

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
