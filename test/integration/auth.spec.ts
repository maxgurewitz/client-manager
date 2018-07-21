import * as Hapi from 'hapi';
import * as uuid from 'uuid/v1';
import axios from 'axios';
import buildServer from  '../../src/server/buildServer';

const BASE_URL = 'http://localhost:3000/api';
let server : Hapi.Server;

beforeAll(async () => {
  server = await buildServer({});
  return server.start();
});

afterAll(() => {
  // https://github.com/sequelize/sequelize/issues/6758
  return server.stop();
});

test('create user returns user and session id', async () => {
  const response = await axios.post(`${BASE_URL}/users`, {
      data: {
        email: `uuid()@example.com`,
        name: 'foo bar',
        password: 'some pass'
      }
  });
  const { sessionId } = response.data;
  expect(sessionId).not.toBeUndefined();
  return null;
});

test('login without token gives 401', async () => {
  try {
    await axios.post(`${BASE_URL}/login`);
    fail('expected to throw');
  } catch (e) {
    expect(e.response.status).toEqual(401);
  }
  return null;
});
