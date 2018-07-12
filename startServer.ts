import buildServer from './src/server/buildServer';

async function startServer() {
  const server = await buildServer({
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    databaseUrl: process.env.DATABASE_URL 
  });
  await server.start();
  return server;
}

startServer()
  .then(server => {
    console.log(`Server started on ${server.info.port}.`);
  })
  .catch(e => {
    console.error('Server start failed.');
    console.error(e);
    process.exit(1);
  });
