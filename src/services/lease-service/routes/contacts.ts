import KoaRouter from '@koa/router'
import { generateRouteMetadata } from 'onecore-utilities'

import * as tenantLeaseAdapter from '../adapters/xpand/tenant-lease-adapter'

export const routes = (router: KoaRouter) => {
  router.get('(.*)/contacts/search', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['q'])

    if (typeof ctx.query.q !== 'string') {
      ctx.status = 400
      ctx.body = { reason: 'Invalid query parameter', ...metadata }
      return
    }

    const result = await tenantLeaseAdapter.getContactsDataBySearchQuery(
      ctx.query.q
    )

    if (!result.ok) {
      ctx.status = 500
      ctx.body = { error: result.err || 'Internal server error', ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = { content: result.data, ...metadata }
  })
}
