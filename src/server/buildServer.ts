import * as Hapi from 'hapi';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as inert from 'inert';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Boom from 'boom';

const authPlugin = {
  pkg: {
    name: 'custom-auth',
    version: '1'
  },
  register(server: Hapi.Server) {
    server.auth.scheme('custom-auth', server => {
      return {
        async authenticate(request: Hapi.Request, h: Hapi.ResponseToolkit) {
          if (!request.headers.authorization) {
            throw Boom.unauthorized('Must provide authorization token');
          }

          return h.authenticated({
            credentials: {
              token: 'token'
            },
            artifacts: {
              projectId: 'projectId',
              email: 'email'
            }
          });
        }
      };
    });
  }
};

export default async function buildServer({ port, databaseUrl } : { port?: number, databaseUrl?: string }): Bluebird<Hapi.Server> {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const sequelize = new Sequelize('client-manager', '', '', {
    host: databaseUrl || 'localhost',
    dialectOptions: {
      ssl: process.env.NODE_ENV !== 'development'
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

  const serverConfig: Hapi.ServerOptions = {
    port: port || 3000,
    host: '0.0.0.0',
    debug: {
      request: process.env.NODE_ENV === 'test' ? false : ['error']
    },
    routes: {
      files: {
        relativeTo: path.join(__dirname, '..', '..', 'dist')
      }
    }
  };

  if (process.env.NODE_ENV === 'test') {
    _.set(serverConfig, 'routes.cors.origin', ['*']);
  }
  const server = new Hapi.Server(serverConfig);

  await server.register([
    inert,
    authPlugin
  ]);

  server.auth.strategy('session', 'custom-auth');

  server.auth.default('session');

  server.route({
    method: 'POST',
    path: '/api/logout',
    handler: async (request, h) => {
      return h.response().code(204);
    }
  });

  server.route({
    method: 'POST',
    path: '/api/login',
    handler: async (request, h) => {
      return { token: 'token' };
    }
  });

  server.route({
    method: 'POST',
    path: '/api/users',
    options: {
      auth: false
    },
    handler: async (request, h) => {
      return { token: 'token', user: {} };
    }
  });

  server.route({
    method: 'GET',
    path: '/public/{param*}',
    options: {
      auth: false
    },
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
