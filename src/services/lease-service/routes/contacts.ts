import KoaRouter from '@koa/router'
import { generateRouteMetadata, logger } from 'onecore-utilities'
import { leasing, WaitingListType } from 'onecore-types'
import { z } from 'zod'

import * as tenantLeaseAdapter from '../adapters/xpand/tenant-lease-adapter'
import * as applicationProfileAdapter from '../adapters/application-profile-adapter'
import {
  getContactByContactCode,
  getContactByNationalRegistrationNumber,
  getContactByPhoneNumber,
} from '../adapters/xpand/tenant-lease-adapter'

import {
  addApplicantToToWaitingList,
  removeApplicantFromWaitingList,
} from '../adapters/xpand/xpand-soap-adapter'
import { getTenant } from '../get-tenant'
import { db } from '../adapters/db'
import { parseRequestBody } from '../../../middlewares/parse-request-body'

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

  interface CreateWaitingListRequest {
    contactCode: string
    waitingListType: WaitingListType
  }

  /**
   * @swagger
   * /contacts/{nationalRegistrationNumber}/waitingLists:
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
   *               waitingListType:
   *                 type: WaitingListType
   *                 description: The type of the waiting list.
   *     responses:
   *       201:
   *         description: Contact successfully added to the waiting list.
   *       500:
   *         description: Internal server error. Failed to add contact to the waiting list.
   */
  router.post(
    '(.*)/contacts/:nationalRegistrationNumber/waitingLists',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const request = <CreateWaitingListRequest>ctx.request.body
      try {
        await addApplicantToToWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListType
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
   * /contacts/{nationalRegistrationNumber}/waitingLists/reset:
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
   *               waitingListType:
   *                 type: WaitingListType
   *                 description: The type of the waiting list.
   *     responses:
   *       201:
   *         description: Waiting list successfully reset for contact.
   *       500:
   *         description: Internal server error. Failed to reset waiting list for contact.
   */
  router.post(
    '(.*)/contacts/:nationalRegistrationNumber/waitingLists/reset',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const request = <CreateWaitingListRequest>ctx.request.body
      try {
        //remove from waitinglist
        const res = await removeApplicantFromWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListType
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
          request.waitingListType as WaitingListType
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

  /**
   * @swagger
   * /contacts/{contactCode}/application-profile:
   *   get:
   *     summary: Gets an application profile by contact code
   *     description: Retrieve application profile information by contact code.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code associated with the application profile.
   *     responses:
   *       200:
   *         description: Successfully retrieved application profile.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The application profile data.
   *       404:
   *         description: Not found.
   *       500:
   *         description: Internal server error. Failed to retrieve application profile information.
   */

  type GetApplicationProfileResponseData = z.infer<
    typeof leasing.GetApplicationProfileResponseDataSchema
  >

  router.get('(.*)/contacts/:contactCode/application-profile', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const profile = await applicationProfileAdapter.getByContactCode(
      db,
      ctx.params.contactCode
    )

    if (!profile.ok) {
      if (profile.err === 'not-found') {
        ctx.status = 404
        ctx.body = { error: 'not-found', ...metadata }
        return
      }

      ctx.status = 500
      ctx.body = { error: 'unknown', ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = {
      content: profile.data satisfies GetApplicationProfileResponseData,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /contacts/{contactCode}/application-profile:
   *   put:
   *     summary: Updates an application profile by contact code
   *     description: Update application profile information by contact code.
   *     tags: [Contacts]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code associated with the application
   *         profile.
   *     requestBody:
   *       required: true
   *       content:
   *          application/json:
   *             schema:
   *               type: object
   *       properties:
   *         numAdults:
   *           type: number
   *           description: Number of adults in the current housing.
   *         numChildren:
   *           type: number
   *           description: Number of children in the current housing.
   *         expiresAt:
   *           type: string
   *           format: date
   *           nullable: true
   *           description: Number of children in the current housing.
   *     responses:
   *       200:
   *         description: Successfully updated application profile.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: The application profile data.
   *       404:
   *         description: Not found.
   *       500:
   *         description: Internal server error. Failed to update application profile information.
   */

  type UpdateApplicationProfileResponseData = z.infer<
    typeof leasing.UpdateApplicationProfileResponseDataSchema
  >

  router.put(
    '(.*)/contacts/:contactCode/application-profile',
    parseRequestBody(leasing.UpdateApplicationProfileRequestParamsSchema),
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const profile = await applicationProfileAdapter.getByContactCode(
        db,
        ctx.params.contactCode
      )

      if (!profile.ok) {
        if (profile.err === 'not-found') {
          ctx.status = 404
          ctx.body = { error: 'not-found', ...metadata }
          return
        } else {
          ctx.status = 500
          ctx.body = { error: 'unknown', ...metadata }
          return
        }
      }

      const update = await applicationProfileAdapter.update(
        db,
        profile.data.id,
        ctx.request.body
      )

      if (!update.ok) {
        if (update.err === 'no-update') {
          ctx.status = 404
          ctx.body = { error: 'not-found', ...metadata }
          return
        }

        ctx.status = 500
        ctx.body = { error: 'unknown', ...metadata }
        return
      }

      ctx.status = 200
      ctx.body = {
        content: update.data satisfies UpdateApplicationProfileResponseData,
        ...metadata,
      }
    }
  )
}
