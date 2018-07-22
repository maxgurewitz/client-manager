import * as Hapi from 'hapi';
import * as Bluebird from 'bluebird';
import * as uuid from 'uuid/v1';
import axios from 'axios';
import buildServer from  '../../src/server/buildServer';

global.Promise = Bluebird;
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

test('project creator can assign permissions', async () => {
  const [userResponse1, userResponse2] = await Bluebird.all([
    axios.post(`${BASE_URL}/users`, {
      email: `${uuid()}@example.com`,
      name: 'foo bar',
      password: 'some pass'
    }),
    axios.post(`${BASE_URL}/users`, {
      email: `${uuid()}@example.com`,
      name: 'foo bar',
      password: 'some pass'
    })
  ]);

  const projectResponse = await axios(`${BASE_URL}/projects`, {
    method: 'post',
    data: {
      name: uuid()
    },
    headers: {
      authorization: userResponse1.data.sessionId
    }
  });

  await axios(`${BASE_URL}/permissions`, {
    method: 'post',
    data: {
      level: 1,
      projectId: projectResponse.data.project.id,
      targetId: userResponse2.data.user.id
    },
    headers: {
      authorization: userResponse1.data.sessionId
    }
  });

  await axios(`${BASE_URL}/projects/${projectResponse.data.project.id}`, {
    method: 'get',
    headers: {
      authorization: userResponse2.data.sessionId
    }
  });
  return null;
});

test('creator of project has authorization for that project, not for other projects', async () => {
  const [userResponse1, userResponse2] = await Bluebird.all([
    axios.post(`${BASE_URL}/users`, {
      email: `${uuid()}@example.com`,
      name: 'foo bar',
      password: 'some pass'
    }),
    axios.post(`${BASE_URL}/users`, {
      email: `${uuid()}@example.com`,
      name: 'foo bar',
      password: 'some pass'
    })
  ]);

  const [projectResponse1, projectResponse2] = await Bluebird.all([
    axios(`${BASE_URL}/projects`, {
      method: 'post',
      data: {
        name: uuid()
      },
      headers: {
        authorization: userResponse1.data.sessionId
      }
    }),
    axios(`${BASE_URL}/projects`, {
      method: 'post',
      data: {
        name: uuid()
      },
      headers: {
        authorization: userResponse2.data.sessionId
      }
    })
  ]);

  // can retrieve one's own project
  await axios(`${BASE_URL}/projects/${projectResponse1.data.project.id}`, {
    method: 'get',
    headers: {
      authorization: userResponse1.data.sessionId
    }
  });

  // can't retrieve other project
  try {
    await axios(`${BASE_URL}/projects/${projectResponse2.data.project.id}`, {
      method: 'get',
      headers: {
        authorization: userResponse1.data.sessionId
      }
    });
    fail('expected to throw');
  } catch (e) {
    expect(e.response.status).toEqual(403);
  }

  return null;
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
