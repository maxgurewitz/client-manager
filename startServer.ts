import buildServer from './src/server/buildServer';

async function startServer() {
  const server = await buildServer({
    port: process.env.$PORT ? Number(process.env.$PORT) : undefined
  });
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
