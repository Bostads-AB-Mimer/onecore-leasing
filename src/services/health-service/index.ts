import KoaRouter from '@koa/router'
import { SystemHealth, ListingStatus } from 'onecore-types'
import config from '../../common/config'
import { healthCheck as xpandSoapApiHealthCheck } from '../lease-service/adapters/xpand/xpand-soap-adapter'
import knex from 'knex'

const healthChecks: Map<string, SystemHealth> = new Map()

const probe = async (
  systemName: string,
  minimumMinutesBetweenRequests: number,
  checkFunction: Function,
  activeMessage?: string
): Promise<SystemHealth> => {
  let currentHealth = healthChecks.get(systemName)

  if (
    !currentHealth ||
    Math.floor(
      (new Date().getTime() - currentHealth.timeStamp.getTime()) / 60000
    ) >= minimumMinutesBetweenRequests
  ) {
    try {
      const result = await checkFunction()

      if (result) {
        currentHealth = {
          status: result.status,
          name: result.name,
          subsystems: result.subsystems,
          timeStamp: new Date(),
        }
      } else {
        currentHealth = {
          status: 'active',
          name: systemName,
          timeStamp: new Date(),
        }
        if (activeMessage) currentHealth.statusMessage = activeMessage
      }
    } catch (error: any) {
      if (error instanceof ReferenceError) {
        currentHealth = {
          status: 'impaired',
          statusMessage: error.message || 'Reference error ' + systemName,
          name: systemName,
          timeStamp: new Date(),
        }
      } else {
        currentHealth = {
          status: 'failure',
          statusMessage: error.message || 'Failed to access ' + systemName,
          name: systemName,
          timeStamp: new Date(),
        }
      }
    }

    healthChecks.set(systemName, currentHealth)
  }
  return currentHealth
}

const subsystems = [
  {
    probe: async (): Promise<SystemHealth> => {
      return await probe(
        config.health.leasingDatabase.systemName,
        config.health.leasingDatabase.minimumMinutesBetweenRequests,
        async () => {
          const db = knex({
            client: 'mssql',
            connection: config.leasingDatabase,
          })

          await db.table('listing').limit(1)
        }
      )
    },
  },
  {
    probe: async (): Promise<SystemHealth> => {
      return await probe(
        config.health.xpandDatabase.systemName,
        config.health.xpandDatabase.minimumMinutesBetweenRequests,
        async () => {
          const db = knex({
            client: 'mssql',
            connection: config.xpandDatabase,
          })

          await db.table('cmctc').limit(1)
        }
      )
    },
  },
  {
    probe: async (): Promise<SystemHealth> => {
      return await probe(
        config.health.expiredListingsScript.systemName,
        config.health.expiredListingsScript.minimumMinutesBetweenRequests,
        async () => {
          const db = knex({
            client: 'mssql',
            connection: config.xpandDatabase,
          })
          const expiredActiveListings = await db('listing')
            .where('PublishedTo', '<', new Date(Date.now() - 86400000))
            .andWhere('Status', ListingStatus.Active)

          if (expiredActiveListings.length > 0) {
            throw new ReferenceError(
              `Found ${expiredActiveListings.length} listings that should be expired but are still active.`
            )
          }
        },
        'All expired listings are correctly marked as expired.'
      )
    },
  },
  {
    probe: async (): Promise<SystemHealth> => {
      return await probe(
        config.health.xpandSoapApi.systemName,
        config.health.xpandSoapApi.minimumMinutesBetweenRequests,
        xpandSoapApiHealthCheck
      )
    },
  },
]

export const routes = (router: KoaRouter) => {
  router.get('(.*)/health', async (ctx) => {
    const health: SystemHealth = {
      name: 'leasing',
      status: 'active',
      subsystems: [],
      statusMessage: '',
      timeStamp: new Date(),
    }

    // Iterate over subsystems
    for (const subsystem of subsystems) {
      const subsystemHealth = await subsystem.probe()
      health.subsystems?.push(subsystemHealth)

      switch (subsystemHealth.status) {
        case 'failure':
          health.status = 'failure'
          health.statusMessage = 'Failure because of failing subsystem'
          break
        case 'impaired':
          if (health.status !== 'failure') {
            health.status = 'impaired'
            health.statusMessage = 'Failure because of impaired subsystem'
          }
          break
        case 'unknown':
          if (health.status !== 'failure' && health.status !== 'impaired') {
            health.status = 'unknown'
            health.statusMessage = 'Unknown because subsystem status is unknown'
          }
          break
        default:
          break
      }
    }

    ctx.body = health
  })
}
