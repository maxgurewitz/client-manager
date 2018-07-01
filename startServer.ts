import buildServer from './src/server/buildServer';

async function startServer() {
  const server = await buildServer();
  await server.start();
  return server;
}

startServer()
  .then(() => {
    console.log('Server started.');
  })
  .catch(e => {
    console.error('Server start failed.');
    console.error(e);
    process.exit(1);
  });
