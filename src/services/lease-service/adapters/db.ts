import knex from 'knex'
import Config from '../../../common/config'
import * as path from 'path'

const stdConfig = {
  client: 'mssql',
  connection: Config.leasingDatabase,
}

const testConfig =       {
  client: "sqlite3",
  connection: ":memory:",
  useNullAsDefault: true,
  migrations: {
    tableName: 'migrations',
    directory: path.join(__dirname, '../../../../migrations')
  },
  seeds: {
    directory: path.join(__dirname, '../../../../seeds/dev')
  }
}

const environment = process.env.NODE_ENV || 'dev';
const environmentConfig  = environment != 'test' ? stdConfig : testConfig

export const db = knex(environmentConfig)

const setup = async () => {
  await db.migrate.latest()
    .then(() => {
      console.log("Migrations applied");
    })
    .catch((error) => {
      console.error("Error applying migrations:", error);
    });

  await db.seed.run()
    .then(() => {
      console.log("seeds applied");
    })
    .catch((error) => {
      console.error("Error applying seeds:", error);
    });


  const tables = await db.raw("SELECT name FROM sqlite_master WHERE type='table';");
  console.log("Current tables in the database:", tables);
}

const teardown = async() => {
  console.log("Rolling back migrations from directory:", path.resolve(path.join(__dirname, '../../../../migrations')))
  try {
    await db.migrate.rollback();
    console.log("Migrations rolled back");
  } catch (error) {
    console.error("Error rolling back migrations:", error);
  }

  await db.destroy();
  console.log("database destroyed")
}

export {setup, teardown}
