import KoaRouter from '@koa/router'
import { generateRouteMetadata, logger } from 'onecore-utilities'

import * as invoicesAdapter from '../adapters/xpand/invoices-adapter'

//todo: remove /contact from these routes?

/**
 * @swagger
 * tags:
 *   - name: Invoices
 *     description: Endpoints related to invoice operations
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /contact/invoices/contactCode/{contactCode}:
   *   get:
   *     summary: Get invoices for contact
   *     description: Retrieve invoices associated with a contact by contact code.
   *     tags: [Invoices]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the contact.
   *     responses:
   *       200:
   *         description: Successfully retrieved invoices.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Invoice details.
   *       500:
   *         description: Internal server error. Failed to retrieve invoices.
   */
  router.get('(.*)/contact/invoices/contactCode/:contactCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const responseData = await invoicesAdapter.getInvoicesByContactCode(
        ctx.params.contactCode
      )

      ctx.body = {
        content: responseData,
        ...metadata,
      }
    } catch (error) {
      logger.error(error, 'Error getting invoices by contact code')
      throw error
    }
  })

  /**
   * @swagger
   * /contact/unpaidInvoices/contactCode/{contactCode}:
   *   get:
   *     summary: Get unpaid invoices for contact
   *     description: Retrieve unpaid invoices associated with a contact by contact code.
   *     tags: [Invoices]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the contact.
   *     responses:
   *       200:
   *         description: Successfully retrieved unpaid invoices.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Invoice details.
   *       500:
   *         description: Internal server error. Failed to retrieve unpaid invoices.
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

  /**
   * @swagger
   * /invoices/{invoicenumber}:
   *   get:
   *     summary: Get unpaid invoices for contact
   *     description: Retrieve unpaid invoices associated with a contact by contact code.
   *     tags: [Invoices]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the contact.
   *     responses:
   *       200:
   *         description: Successfully retrieved unpaid invoices.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Invoice details.
   *       500:
   *         description: Internal server error. Failed to retrieve unpaid invoices.
   */
  router.get('(.*)/invoices/:invoicenumber', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const responseData = await invoicesAdapter.getInvoice(
      ctx.params.invoicenumber
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })
}
