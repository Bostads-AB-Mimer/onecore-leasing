import KoaRouter from '@koa/router'
import { generateRouteMetadata } from 'onecore-utilities'

import * as tenantLeaseAdapter from '../adapters/xpand/tenant-lease-adapter'
import {
  getContactByContactCode,
  getContactsByContactCodes,
  getContactByNationalRegistrationNumber,
  getContactByPhoneNumber,
} from '../adapters/xpand/tenant-lease-adapter'
import { logger } from 'onecore-utilities'
import {
  addApplicantToToWaitingList,
  getWaitingList,
  removeApplicantFromWaitingList,
} from '../adapters/xpand/xpand-soap-adapter'
import { getTenant } from '../get-tenant'

/**
 * @swagger
 * tags:
 *   - name: Contacts
 *     description: Endpoints related to contact operations
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /contacts/search:
   *   get:
   *     summary: Search contact based by query
   *     description: Search contacts based on a query string.
   *     tags: [Contacts]
   *     parameters:
   *       - in: query
   *         name: q
   *         required: true
   *         schema:
   *           type: string
   *         description: The search query string.
   *     responses:
   *       200:
   *         description: Successfully retrieved contacts data.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                   description: The array of contacts matching the search query.
   *       400:
   *         description: Bad request. The query parameter 'q' must be a string.
   *       500:
   *         description: Internal server error. Failed to retrieve contacts data.
   */
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
      ctx.body = { error: result.err, ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = { content: result.data, ...metadata }
  })

  interface GetContactsByContactCodeRequest {
    contactCodes: string[]
  }

  router.post('(.*)/contacts/by-contact-codes', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)

    console.log(ctx.params)

    const result = await getContactsByContactCodes(
      (<GetContactsByContactCodeRequest>ctx.request.body)['contactCodes']
    )

    if (!result.ok) {
      ctx.status = 500
      ctx.body = { error: result.err, ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = { content: result.data, ...metadata }
  })

  //todo: rename singular routes to plural

  /**
   * @swagger
   * /contact/nationalRegistrationNumber/{pnr}:
   *   get:
   *     summary: Get contact by PNR
   *     description: Retrieve contact information by national registration number (pnr).
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: pnr
   *         required: true
   *         schema:
   *           type: string
   *         description: The national registration number (pnr) of the contact.
   *       - in: query
   *         name: includeTerminatedLeases
   *         schema:
   *           type: boolean
   *         description: Optional. Whether to include terminated leases in the response.
   *     responses:
   *       200:
   *         description: Successfully retrieved contact information.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The contact data.
   *       500:
   *         description: Internal server error. Failed to retrieve contact information.
   */
  router.get('(.*)/contact/nationalRegistrationNumber/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['includeTerminatedLeases'])
    const responseData = await getContactByNationalRegistrationNumber(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases
    )

    ctx.status = 200
    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /contact/contactCode/{contactCode}:
   *   get:
   *     summary: Get contact by contact code
   *     description: Retrieve contact information by contact code.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the contact.
   *       - in: query
   *         name: includeTerminatedLeases
   *         schema:
   *           type: boolean
   *         description: Optional. Whether to include terminated leases in the response.
   *     responses:
   *       200:
   *         description: Successfully retrieved contact information.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The contact data.
   *       500:
   *         description: Internal server error. Failed to retrieve contact information.
   */
  router.get('(.*)/contact/contactCode/:contactCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['includeTerminatedLeases'])
    const result = await getContactByContactCode(
      ctx.params.contactCode,
      ctx.query.includeTerminatedLeases
    )

    if (!result.ok) {
      ctx.status = 500
      ctx.body = { error: result.err, ...metadata }
      return
    }

    if (!result.data) {
      ctx.status = 404
      ctx.body = { reason: 'Contact not found', ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = {
      content: result.data,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /tenants/contactCode/{contactCode}:
   *   get:
   *     summary: Gets tenant by contact code
   *     description: Retrieve tenant information by contact code.
   *     tags: [Tenants]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the tenant.
   *     responses:
   *       200:
   *         description: Successfully retrieved tenant information.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The tenant data.
   *       404:
   *         description: Not found.
   *       500:
   *         description: Internal server error. Failed to retrieve Tenant information.
   */
  router.get('(.*)/tenants/contactCode/:contactCode', async (ctx) => {
    const result = await getTenant({ contactCode: ctx.params.contactCode })
    const metadata = generateRouteMetadata(ctx)

    if (!result.ok) {
      if (result.err === 'contact-not-found') {
        ctx.status = 404
        ctx.body = { error: 'Contact not found', ...metadata }
        return
      }

      ctx.status = 500
      ctx.body = { error: result.err, ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = {
      content: result.data,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /contact/phoneNumber/{phoneNumber}:
   *   get:
   *     summary: Get contact by phone number
   *     description: Retrieve contact information by phone number.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: phoneNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: The phone number of the contact.
   *     responses:
   *       200:
   *         description: Successfully retrieved contact information.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The contact data.
   *       500:
   *         description: Internal server error. Failed to retrieve contact information.
   */
  router.get('(.*)/contact/phoneNumber/:phoneNumber', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const responseData = await getContactByPhoneNumber(
      ctx.params.phoneNumber,
      ctx.query.includeTerminatedLeases
    )

    ctx.status = 200
    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /contact/waitingList/{nationalRegistrationNumber}:
   *   get:
   *     summary: Get waiting list from xpand for contact
   *     description: Retrieve waiting list information for a contact by national registration number.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: nationalRegistrationNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: The national registration number (pnr) of the contact.
   *     responses:
   *       200:
   *         description: Successfully retrieved waiting list information.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The waiting list data.
   *       500:
   *         description: Internal server error. Failed to retrieve waiting list information.
   */
  router.get(
    '(.*)/contact/waitingList/:nationalRegistrationNumber',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      try {
        const result = await getWaitingList(
          ctx.params.nationalRegistrationNumber
        )

        if (!result.ok) {
          ctx.status = 500
          ctx.body = { error: result.err, ...metadata }
          return
        }

        if (!result.data) {
          ctx.status = 400
          ctx.body = { reason: 'Not found', ...metadata }
          return
        }
        ctx.status = 200
        ctx.body = {
          content: result.data,
          ...metadata,
        }
      } catch (error: unknown) {
        logger.error(
          error,
          'Error getting waiting lists for contact by national identity number'
        )
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
            ...metadata,
          }
        }
      }
    }
  )

  interface CreateWaitingListRequest {
    contactCode: string
    waitingListTypeCaption: string
  }

  /**
   * @swagger
   * /contact/waitingList/{nationalRegistrationNumber}:
   *   post:
   *     summary: Add contact to waiting list in xpand
   *     description: Add a contact to a waiting list by national registration number.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: nationalRegistrationNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: The national registration number (pnr) of the contact.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contactCode:
   *                 type: string
   *                 description: The code of the contact to be added to the waiting list.
   *               waitingListTypeCaption:
   *                 type: string
   *                 description: The caption or type of the waiting list.
   *     responses:
   *       201:
   *         description: Contact successfully added to the waiting list.
   *       500:
   *         description: Internal server error. Failed to add contact to the waiting list.
   */
  router.post(
    '(.*)/contact/waitingList/:nationalRegistrationNumber',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const request = <CreateWaitingListRequest>ctx.request.body
      try {
        await addApplicantToToWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListTypeCaption
        )

        ctx.status = 201
        ctx.body = {
          message: 'Applicant successfully added to waiting list',
          ...metadata,
        }
      } catch (error: unknown) {
        logger.error(error, 'Error adding contact to waitingList')
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
            ...metadata,
          }
        }
      }
    }
  )

  /**
   * @swagger
   * /contact/waitingList/{nationalRegistrationNumber}/reset:
   *   post:
   *     summary: Reset a waiting list for a contact in XPand
   *     description: Resets a waiting list for a contact by national registration number.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: nationalRegistrationNumber
   *         required: true
   *         schema:
   *           type: string
   *         description: The national registration number (pnr) of the contact.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               contactCode:
   *                 type: string
   *                 description: The code of the contact whose waiting list should be reset.
   *               waitingListTypeCaption:
   *                 type: string
   *                 description: The caption or type of the waiting list.
   *     responses:
   *       201:
   *         description: Waiting list successfully reset for contact.
   *       500:
   *         description: Internal server error. Failed to reset waiting list for contact.
   */
  router.post(
    '(.*)/contact/waitingList/:nationalRegistrationNumber/reset',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const request = <CreateWaitingListRequest>ctx.request.body
      try {
        //remove from waitinglist
        const res = await removeApplicantFromWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListTypeCaption
        )

        if (!res.ok) {
          ctx.status = res.err == 'not-in-waiting-list' ? 404 : 500
          ctx.body = {
            error:
              res.err == 'not-in-waiting-list'
                ? 'Contact Not In Waiting List'
                : 'Unknown error',
          }
          return
        }

        //add to waitinglist
        await addApplicantToToWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListTypeCaption
        )

        ctx.status = 200
        ctx.body = {
          content: {
            message: 'Waiting List time successfullt reset for applicant',
          },
          ...metadata,
        }
      } catch (error: unknown) {
        logger.error(error, 'Error resetting waitingList for applicant')
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
            ...metadata,
          }
        }
      }
    }
  )
}
