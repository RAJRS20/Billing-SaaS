import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';

async function main() {
  const dbDir = path.resolve(process.cwd(), '.pgdata');
  console.log('Initializing embedded postgres at:', dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  try {
    await pg.initialise();
    console.log('Postgres initialized.');
  } catch (err) {
    console.log('Initialise note:', err?.message || err);
  }

  await pg.start();
  console.log('Postgres started on port 5432!');

  try {
    await pg.createDatabase('jewellery_billing');
    console.log('Created database: jewellery_billing');
  } catch (e) {
    console.log('Database already exists or created:', e?.message);
  }

  console.log('Embedded PostgreSQL is ready and running.');
  
  // Keep alive
  setInterval(() => {}, 10000);
}

main().catch(console.error);
