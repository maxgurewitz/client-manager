import * as Hapi from 'hapi';
import * as _ from 'lodash';
import * as Bluebird from 'bluebird';
import * as inert from 'inert';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import * as Sequelize from 'sequelize';
import * as hapiJwt from 'hapi-auth-jwt2';

async function verifyJwt(token: string, cert: string) {
  const decoded = await new Bluebird((resolve, reject) => {
    console.log('loc1', token, cert);
    jwt.verify(token, cert, (err: Error, decoded: object) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });

  console.log('loc2', decoded);
}

function validate(decoded: object, request: Hapi.Request): hapiJwt.ValidationResult {
  console.log('loc1', decoded);
  return { isValid: true };
}

const authHardcoded = 'MIIDBTCCAe2gAwIBAgIJXNFmm/00aDEeMA0GCSqGSIb3DQEBCwUAMCAxHjAcBgNVBAMTFW1heHRoZWdlZWsxLmF1dGgwLmNvbTAeFw0xODA3MDEwNjU1MTFaFw0zMjAzMDkwNjU1MTFaMCAxHjAcBgNVBAMTFW1heHRoZWdlZWsxLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANKfuFitIpFrJbgm8JENTlwOLDZWvMidE2zCSHlpyotQdDohFKfOHqs/Hjj9DJ8AzIw0q3N+Xc3gt8klPOm6Ix/D55Q4DECQO/orGhyCL0NkuYKn6iGAS4hRwgrz9syCVfDQEe/K1PUC9AnfBGgj9SDxScO7sjRaMjTqxscphrB7sAXtgKvVRERuaQxc8JeX2x/HGMUNrJlFho2s/sn+UP6fH5Ix1vfIB1w3ixRiku9Qp1nCAkVTBCPIVRBm+9Hq1UohE+uBCkXQ6+fxEF2h+7p4VEgoR3eV4psBsZX46jOeEucucxPzPNhoNx7S67MViPJuIlkNG8uZB1ag6flX+g0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUHXj0hn1+jKHAim02ffhpegWRL5AwDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQBEs/pBb+YbjLwdwFMmVIgA8mzduXJxleAtWl1ffKxjG57ApJ8xLuc2vIoygB5rX/kNZZgTyZzTvdPg2rbWCNsONUzxic4eDAcuPHGalN9VlB03QH29uEWyxYa0sL1FlToQbYglT5pkS68F6wbOxHSqZFuFvKmtaRPHNJZqMJLVx9GuOchozjllrGiZ6ko5iu7ePRkM44IXgp5+Bq4cDOWV41lFEOg5ClLXGh/PIhHxOKnKGuWxfHBHu8p8LwQ5w9cqDye88rEBqO/WMNb6TYCu6HRxVPKwVRsF8ZeBN2Bc1EpRnWw3ffMbxGNwag0otCNnWf8eCGGiEG3UXDLBMN2T';

export default async function buildServer({ port, databaseUrl } : { port?: number, databaseUrl?: string }): Bluebird<Hapi.Server> {  process.env.NODE_ENV = process.env.NODE_ENV || 'development';  const authKey = process.env.AUTH0;  console.log('loc1', authKey);
  if (!authKey) {    throw new Error('Missing auth0 public key');  }
  const sequelize = new Sequelize('client-manager', '', '', {    host: databaseUrl || 'localhost',    dialectOptions: {
      ssl: process.env.NODE_ENV !== 'development',    },    dialect: 'postgres',    operatorsAliases: false,
    pool: {      max: 5,      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  const server = new Hapi.Server({
      port: port || 3000,
      host: '0.0.0.0',
      debug: {
        request: ['error']
      },
      routes: {
        files: {
          relativeTo: path.join(__dirname, '..', '..', 'dist')
        }
      }
  });

  await server.register([
    inert,
    hapiJwt
  ]);

  server.auth.strategy('jwt', 'jwt', {
    key: authKey,          // Never Share your secret key
    validate,            // validate function defined above
    verifyOptions: { algorithms: [ 'RS256' ] } // pick a strong algorithm
  });

  server.auth.default('jwt');

  server.route({
    method: 'GET',
    path: '/api/authenticate',
    options: {
      //FIXME
      // auth: false,
    },
    handler: async (request, h) => {
      console.log('loc2', authKey);
      console.log('loc3', request.headers.authentication);
      return { projectId: 'api' };
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
