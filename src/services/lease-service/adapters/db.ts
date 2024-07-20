import knex from 'knex'
import Config from '../../../common/config'
import * as path from 'path'
import { logger } from 'onecore-utilities'

const getStandardConfig = () => ({
  client: 'mssql',
  connection: Config.leasingDatabase,
})

const getTestConfig = () => {
  let port = process.env.LEASING_DATABASE__PORT
  if (port == undefined) {
    port = '-1' //use invalid port if port is missing from .env.test.config
  }
  return {
    client: 'mssql',
    connection: {
      host: process.env.LEASING_DATABASE__HOST,
      database: process.env.LEASING_DATABASE__DATABASE,
      user: process.env.LEASING_DATABASE__USER,
      password: process.env.LEASING_DATABASE__PASSWORD,
      port: parseInt(port),
    },
    useNullAsDefault: true,
    migrations: {
      tableName: 'migrations',
      directory: path.join(__dirname, '../../../../migrations'),
    },
  }
}

const getConfigBasedOnEnvironment = () => {
  const environment = process.env.NODE_ENV || 'dev'
  return environment === 'test' ? getTestConfig() : getStandardConfig()
}

export const db = knex(getConfigBasedOnEnvironment())

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
