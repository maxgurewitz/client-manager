import * as Hapi from 'hapi';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as inert from 'inert';
import * as path from 'path';
import * as Sequelize from 'sequelize';
import * as Boom from 'boom';
import * as bcrypt from 'bcrypt';
import * as models from '../../models';
import * as uuid from 'uuid/v1';
import * as joi from 'joi';

// 3 days in ms
const SESSION_EXPIRATION = 1000 * 60 * 60 * 24 * 3;

interface ISession {
  expiration: number,
  uuid: string,
  userId: number
}

interface ICredentials {
  sessionId: string
}

interface IAuthArtifact {
  userId: number
}

interface ILogin {
  email: string,
  password: string
};

interface ICreateProject {
  name: string
}

interface ICreateUser {
  email: string,
  name: string,
  password: string
};

interface ICreatePermission {
  projectId: number,
  targetId: number,
  level: number
};

async function getProject(projectId: number, userId: number) {
  await checkProjectPermissions(userId, projectId, 1);
  const project = await models.Project.findById(projectId);
  return { project: { id: projectId, name: project.name } };
}

async function checkProjectPermissions(userId: number, projectId: number, maxPermissionLevel: number) {
  const permission = await models.Permission.findOne({
    where: {
      projectId,
      userId
    }
  });

  if (!permission) {
    throw Boom.forbidden('Missing permissions for this project.');
  } else if (Number(permission.level) > maxPermissionLevel) {
    throw Boom.forbidden('Permissions are too weak to support operation.');
  }
}

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
            throw Boom.unauthorized('Must provide authorization header.');
          }

          const session: ISession = await models.Session.findOne({
            where: {
              uuid: request.headers.authorization
            }
          });

          if (!session) {
            throw Boom.unauthorized('Invalid authorization header.');
          }

          if (Date.now() > session.expiration) {
            // FIXME soft delete session
            throw Boom.unauthorized('Session has expired');
          }

          const credentials: ICredentials = {
            sessionId: session.uuid
          };

          const artifacts: IAuthArtifact = {
            userId: session.userId
          };

          return h.authenticated({ credentials, artifacts });
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
      request: ['error']
    },
    routes: {
      validate: {
        failAction: async (request, h, err) => {
          if (process.env.NODE_ENV === 'production') {
            throw Boom.badRequest('Invalid request payload input');
          } else {
            throw err;
          }
        }
      },
      files: {
        relativeTo: path.join(__dirname, '..', '..', 'dist')
      }
    }
  };

  if (process.env.NODE_ENV === 'test') {
    _.set(serverConfig, 'routes.cors.origin', ['*']);
  }
  const server = new Hapi.Server(serverConfig);

  server.events.on('stop', async () => {
    await sequelize.close();
    console.log('Server stopped');
  });

  await server.register([
    inert,
    authPlugin
  ]);

  server.auth.strategy('session', 'custom-auth');

  server.auth.default('session');

  server.route({
    method: 'POST',
    path: '/api/projects',
    options: {
      validate: {
        payload: {
          name: joi.string().required()
        }
      }
    },
    handler: async (request, h) => {
      const { userId } = <IAuthArtifact> request.auth.artifacts;

      const { name } = <ICreateProject> request.payload;

      const project = await models.Project.create({ name });

      await models.Permission.create({
        level: '0',
        projectId: project.id,
        userId
      });

      return { project: { id: project.id } };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/projects/latest',
    handler: async (request, h) => {
      const { userId } = <IAuthArtifact> request.auth.artifacts;

      const lastPermission = await models.Permission.findOne({
          where: {
            userId
          },
          order: [['createdAt', 'DESC']]
      });

      if (!lastPermission) {
        throw Boom.forbidden('Lacking permissions for any project.');
      }

      const { projectId } = lastPermission;

      const project = await models.Project.findById(projectId);

      return { project: { id: projectId, name: project.name } };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/projects/{projectId}',
    options: {
      validate: {
        params: {
          projectId: joi.number().required()
        }
      }
    },
    handler: async (request, h) => {
      const { userId } = <IAuthArtifact> request.auth.artifacts;

      const projectId = <number> _.get(request, 'params.projectId');

      await checkProjectPermissions(userId, projectId, 1);

      const project = await models.Project.findById(projectId);

      return { project: { id: projectId, name: project.name } };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/projects',
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      return { projects: [] };
    }
  });

  server.route({
    method: 'GET',
    path: '/api/clients',
    handler: async (request, h) => {
      return { clients: [] };
    }
  });

  // AUTHENTICATION

  server.route({
    method: 'POST',
    path: '/api/permissions',
    options: {
      validate: {
        payload: {
          projectId: joi.number().required(),
          targetId: joi.number().required(),
          level: joi.number().only(0, 1).required()
        }
      }
    },
    handler: async (request, h) => {
      const { userId } = <IAuthArtifact> request.auth.artifacts;
      const { projectId, targetId, level } = <ICreatePermission> request.payload;

      await checkProjectPermissions(userId, projectId, 0);

      await models.Permission.upsert({
        level: String(level),
        projectId,
        userId: targetId
      });

      return h.response().code(204);
    }
  });

  server.route({
    method: 'POST',
    path: '/api/logout',
    handler: async (request, h) => {
      const credentials = <ICredentials> request.auth.credentials;

      // FIXME soft delete
      await models.Session.destroy({
        where: {
          uuid: credentials.sessionId
        }
      });
      return h.response().code(204);
    }
  });

  server.route({
    method: 'POST',
    path: '/api/login',
    options: {
      auth: false,
      validate: {
        payload: {
          email: joi.string().email().required(),
          password: joi.string().required(),
        }
      }
    },
    handler: async (request, h) => {
      const { email, password } = <ILogin> request.payload;

      const user = await models.User.findOne({
        where: { email }
      });

      const isPasswordValid = bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw Boom.unauthorized('Invalid password');
      }

      const sessionId = uuid();

      const session = await models.Session.create({
        userId: user.id,
        expiration: Date.now() + SESSION_EXPIRATION,
        uuid: sessionId
      });

      return { sessionId };
    }
  });

  server.route({
    method: 'POST',
    path: '/api/users',
    options: {
      auth: false
    },
    handler: async (request, h) => {
      const { email, name, password } = <ICreateUser> request.payload;
      const encryptedPassword = await bcrypt.hash(password, 10);

      const user = await models.User.create({
        email,
        name,
        password: encryptedPassword
      });

      const sessionId = uuid();

      await models.Session.create({
        userId: user.id,
        uuid: sessionId,
        expiration: Date.now() + SESSION_EXPIRATION
      });

      return {
        user: { id: user.id },
        sessionId
      };
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
