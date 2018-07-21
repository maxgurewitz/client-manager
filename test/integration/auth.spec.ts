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

test("bad session ids don't give access", async () => {
  try {
    await axios(`${BASE_URL}/logout`, {
      method: 'post',
      headers: {
        authorization: 'foo'
      }
    });
    fail('expected to throw');
  } catch (e) {
    expect(e.response.status).toEqual(401);
  }
  return null;
});

test('create user returns user and working session id', async () => {
  const response = await axios.post(`${BASE_URL}/users`, {
    email: `${uuid()}@example.com`,
    name: 'foo bar',
    password: 'some pass'
  });
  const { sessionId } = response.data;
  expect(sessionId).not.toBeUndefined();
  return null;
});

test('login without session id gives 401', async () => {
  try {
    await axios.post(`${BASE_URL}/login`);
    fail('expected to throw');
  } catch (e) {
    expect(e.response.status).toEqual(401);
  }
  return null;
});
