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

test('good session ids do give access', async () => {
  const response = await axios.post(`${BASE_URL}/users`, {
    email: `${uuid()}@example.com`,
    name: 'foo bar',
    password: 'some pass'
  });

  await axios(`${BASE_URL}/logout`, {
    method: 'post',
    headers: {
      authorization: response.data.sessionId
    }
  });

  return null;
});

test('logging in works', async () => {
  const email = `${uuid()}@example.com`;
  const password = 'some pass';
  const createUserResponse = await axios.post(`${BASE_URL}/users`, {
    email,
    name: 'foo bar',
    password
  });

  await axios(`${BASE_URL}/logout`, {
    method: 'post',
    headers: {
      authorization: createUserResponse.data.sessionId
    }
  });

  const loginResponse = await axios.post(`${BASE_URL}/login`, {
    email,
    password
  });

  await axios(`${BASE_URL}/logout`, {
    method: 'post',
    headers: {
      authorization: loginResponse.data.sessionId
    }
  });

  return null;
});

test('logging out works', async () => {
  const createUserResponse = await axios.post(`${BASE_URL}/users`, {
    email: `${uuid()}@example.com`,
    name: 'foo bar',
    password: 'some pass'
  });

  await axios(`${BASE_URL}/logout`, {
    method: 'post',
    headers: {
      authorization: createUserResponse.data.sessionId
    }
  });

  try {
    await axios(`${BASE_URL}/logout`, {
      method: 'post',
      headers: {
        authorization: createUserResponse.data.sessionId
      }
    });
    fail('expected to throw');
  } catch (e) {
    expect(e.response.status).toEqual(401);
  }

  return null;
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
