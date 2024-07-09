import KoaRouter from '@koa/router'

import * as tenantLeaseAdapter from '../adapters/xpand/tenant-lease-adapter'

export const routes = (router: KoaRouter) => {
  /**
   * @api {get} /user/:id Request User information
   * @apiName GetUser
   * @apiGroup User
   *
   * @apiParam {Number} id User's unique ID.
   *
   * @apiSuccess {String} firstname Firstname of the User.
   * @apiSuccess {String} lastname  Lastname of the User.
   */
  router.get('(.*)/contacts/search', async (ctx) => {
    if (typeof ctx.query.q !== 'string') {
      ctx.status = 400
      return
    }

    const result = await tenantLeaseAdapter.getContactsDataBySearchQuery(
      ctx.query.q
    )

    if (!result.ok) {
      ctx.status = 500
      return
    }

    ctx.status = 200
    ctx.body = { data: result.data }
  })
}
