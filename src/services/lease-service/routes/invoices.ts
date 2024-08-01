import KoaRouter from '@koa/router'
import { generateRouteMetadata } from 'onecore-utilities'

import * as invoicesAdapter from '../adapters/xpand/invoices-adapter'

export const routes = (router: KoaRouter) => {
  /**
   * Gets all invoices for a contact, filtered on paid and unpaid.
   */
  router.get('(.*)/contact/invoices/contactCode/:contactCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const responseData = await invoicesAdapter.getInvoicesByContactCode(
      ctx.params.contactCode
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Gets the detailed status of a persons unpaid invoices.
   */
  router.get(
    '(.*)/contact/unpaidInvoices/contactCode/:contactCode',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const responseData = await invoicesAdapter.getUnpaidInvoicesByContactCode(
        ctx.params.contactCode
      )

      ctx.body = {
        content: responseData,
        ...metadata,
      }
    }
  )
}
