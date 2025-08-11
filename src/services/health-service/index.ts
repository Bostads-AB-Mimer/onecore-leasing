import KoaRouter from '@koa/router'
import { SystemHealth, ListingStatus } from 'onecore-types'
import config from '../../common/config'
import { healthCheck as xpandSoapApiHealthCheck } from '../lease-service/adapters/xpand/xpand-soap-adapter'
import { healthCheck as creditSafeHealthCheck } from '../creditsafe/adapters/creditsafe-adapter'
import { db as leasingDb } from '../lease-service/adapters/db'
import { xpandDb } from '../lease-service/adapters/xpand/estate-code-adapter'

const healthChecks: Map<string, SystemHealth> = new Map()

const probe = async (
  systemName: string,
  minimumMinutesBetweenRequests: number,
  checkFunction: () => any,
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
          await leasingDb.table('listing').limit(1)
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
          const expiredActiveListings = await leasingDb('listing')
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
        config.health.xpandDatabase.systemName,
        config.health.xpandDatabase.minimumMinutesBetweenRequests,
        async () => {
          await xpandDb.table('cmctc').limit(1)
        }
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
  {
    probe: async (): Promise<SystemHealth> => {
      return await probe(
        config.health.creditsafe.systemName,
        config.health.creditsafe.minimumMinutesBetweenRequests,
        creditSafeHealthCheck
      )
    },
  },
]

/**
 * @swagger
 * openapi: 3.0.0
 * tags:
 *   - name: Health
 *     description: Operations related to service health
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Check system health status
   *     tags:
   *       - Health
   *     description: Retrieves the health status of the system and its subsystems.
   *     responses:
   *       '200':
   *         description: Successful response with system health status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name:
   *                   type: string
   *                   example: core
   *                   description: Name of the system.
   *                 status:
   *                   type: string
   *                   example: active
   *                   description: Overall status of the system ('active', 'impaired', 'failure', 'unknown').
   *                 subsystems:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   *                         description: Name of the subsystem.
   *                       status:
   *                         type: string
   *                         enum: ['active', 'impaired', 'failure', 'unknown']
   *                         description: Status of the subsystem.
   *                       details:
   *                         type: string
   *                         description: Additional details about the subsystem status.
   */
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

  const CONNECTIONS = [
    {
      name: 'leasing',
      pool: leasingDb,
    },
    {
      name: 'xpand',
      pool: xpandDb,
    },
  ]

  /**
   * @openapi
   * /health/db:
   *   get:
   *     summary: Database connection pool metrics
   *     tags: [Health]
   *     responses:
   *       '200':
   *         description: Connection pool stats per configured DB connection.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 connectionPools:
   *                   type: integer
   *                   minimum: 0
   *                 metrics:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       name:
   *                         type: string
   *                       pool:
   *                         type: object
   *                         properties:
   *                           used: { type: integer, minimum: 0 }
   *                           free: { type: integer, minimum: 0 }
   *                           pendingCreates: { type: integer, minimum: 0 }
   *                           pendingAcquires: { type: integer, minimum: 0 }
   *             examples:
   *               sample:
   *                 value:
   *                   connectionPools: 2
   *                   metrics:
   *                     - name: "primary"
   *                       pool: { used: 3, free: 5, pendingCreates: 0, pendingAcquires: 1 }
   *                     - name: "reporting"
   *                       pool: { used: 0, free: 8, pendingCreates: 0, pendingAcquires: 0 }
   */
  router.get('(.*)/health/db', async (ctx) => {
    ctx.body = {
      connectionPools: CONNECTIONS.length,
      metrics: CONNECTIONS.map((conn) => {
        const pool = conn.pool.client.pool

        return {
          name: conn.name,
          pool: {
            used: pool.numUsed(),
            free: pool.numFree(),
            pendingCreates: pool.numPendingCreates(),
            pendingAcquires: pool.numPendingAcquires(),
          },
        }
      }),
    }
  })
}
