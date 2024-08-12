import KoaRouter from '@koa/router'
import { SystemHealth, ListingStatus } from 'onecore-types'
import config from '../../common/config'
import knex from 'knex'

const subsystems = [
  {
    probe: async (): Promise<SystemHealth> => {
      try {
        const db = knex({
          client: 'mssql',
          connection: config.leasingDatabase,
        })

        await db.table('listing').limit(1)

        return {
          name: 'leasing database',
          status: 'active',
        }
      } catch (error: any) {
        return {
          name: 'leasing database',
          status: 'failure',
          statusMessage: error.message,
        }
      }
    },
  },
  {
    probe: async (): Promise<SystemHealth> => {
      try {
        const db = knex({
          client: 'mssql',
          connection: config.xpandDatabase,
        })

        await db.table('cmctc').limit(1)
        return {
          name: 'xpand database',
          status: 'active',
        }
      } catch (error: any) {
        return {
          name: 'xpand database',
          status: 'failure',
          statusMessage: error.message,
        }
      }
    },
  },
  {
    probe: async (): Promise<SystemHealth> => {
      try {
        const db = knex({
          client: 'mssql',
          connection: config.xpandDatabase,
        })
        const expiredActiveListings = await db('listing')
          .where('PublishedTo', '<', new Date(Date.now() - 86400000))
          .andWhere('Status', ListingStatus.Active);
    
        if (expiredActiveListings.length > 0) {
          return {
            name: 'expire-listings script',
            status: 'impaired',
            statusMessage: `Found ${expiredActiveListings.length} listings that should be expired but are still active.`,
          };
        }
        return {
          name: 'expire-listings script',
          status: 'active',
          statusMessage: 'All expired listings are correctly marked as expired.',
        };
      } catch (error: any) {
        return {
          name: 'expire-listings script',
          status: 'failure',
          statusMessage: error.message || 'Failed to query the database for expired listings.',
        };
      }
    },
  }
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
