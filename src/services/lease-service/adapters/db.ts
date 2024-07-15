import knex from 'knex'
import Config from '../../../common/config'
import * as path from 'path'
import { logger } from 'onecore-utilities'

const stdConfig = {
  client: 'mssql',
  connection: Config.leasingDatabase,
}

const testConfig = {
  client: 'mssql',
  connection: {
    host: process.env.LEASING_DATABASE__HOST,
    database: process.env.LEASING_DATABASE__DATABASE,
    user: process.env.LEASING_DATABASE__USER,
    password: process.env.LEASING_DATABASE__PASSWORD,
    port: 1433, //parseInt(process.env.LEASING_DATABASE__PORT),
  },
  useNullAsDefault: true,
  migrations: {
    tableName: 'migrations',
    directory: path.join(__dirname, '../../../../migrations'),
  },
  seeds: {
    directory: path.join(__dirname, '../../../../seeds/dev'),
  },
}

const environment = process.env.NODE_ENV || 'dev'
const environmentConfig = environment == 'test' ? testConfig : stdConfig

export const db = knex(environmentConfig)

const migrate = async () => {
  await db.migrate
    .latest()
    .then(() => {
      logger.info('Migrations applied')
    })
    .catch((error) => {
      logger.info('Error applying migrations', error)
    })
}

const teardown = async () => {
  logger.info('Rolling back migrations')
  try {
    await db.migrate.rollback().then(() => {
      logger.info('Migrations rolled back')
    })
    logger.info('Migrations rolled back')
  } catch (error) {
    logger.error('Error rolling back migrations:', error)
  }

  await db.destroy().then(() => {
    logger.info('Database destroyed')
  })
}

export { migrate, teardown }
