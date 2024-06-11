import KoaRouter from '@koa/router'
import { OfferStatus } from 'onecore-types'
import { z } from 'zod'

import * as tenantLeaseAdapter from './adapters/xpand/tenant-lease-adapter'

export const routes = (router: KoaRouter) => {
  router.get('(.*)/contacts', async (ctx) => {
    if (typeof ctx.query.q !== 'string') {
      ctx.body = 400
      return
    }

    const responseData = await getContactsBySearchQuery(ctx.query.q)

    ctx.body = {
      data: responseData,
    }
  })
}
