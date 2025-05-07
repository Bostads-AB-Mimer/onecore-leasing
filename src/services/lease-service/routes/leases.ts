import KoaRouter from '@koa/router'
import {
  getLease,
  getLeasesForContactCode,
  getLeasesForNationalRegistrationNumber,
  getLeasesForPropertyId,
} from '../adapters/xpand/tenant-lease-adapter'
import { createLease } from '../adapters/xpand/xpand-soap-adapter'
import { generateRouteMetadata } from 'onecore-utilities'
import z from 'zod'

/**
 * @swagger
 * tags:
 *   - name: Leases
 *     description: Endpoints related to lease operations
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /leases/for/nationalRegistrationNumber/{pnr}:
   *   get:
   *     summary: Get leases by national registration number
   *     description: Retrieve leases associated with a national registration number (pnr).
   *     tags: [Leases]
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
   *         description: Include terminated leases in the result.
   *       - in: query
   *         name: includeContacts
   *         schema:
   *           type: boolean
   *         description: Include contact information in the result.
   *     responses:
   *       200:
   *         description: Successfully retrieved leases.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Lease details.
   *       500:
   *         description: Internal server error. Failed to retrieve leases.
   */

  const getLeasesForPnrQueryParamSchema = z.object({
    includeUpcomingLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeTerminatedLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeContacts: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  })

  router.get('(.*)/leases/for/nationalRegistrationNumber/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeUpcomingLeases',
      'includeTerminatedLeases',
      'includeContacts',
    ])

    const queryParams = getLeasesForPnrQueryParamSchema.safeParse(ctx.query)
    if (queryParams.success === false) {
      ctx.status = 400
      return
    }

    const responseData = await getLeasesForNationalRegistrationNumber(
      ctx.params.pnr,
      {
        includeUpcomingLeases: queryParams.data.includeUpcomingLeases,
        includeTerminatedLeases: queryParams.data.includeTerminatedLeases,
        includeContacts: queryParams.data.includeContacts,
      }
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /leases/for/contactCode/{contactCode}:
   *   get:
   *     summary: Get leases by contact code
   *     description: Retrieve leases associated with a contact by contact code.
   *     tags: [Leases]
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
   *         description: Include terminated leases in the result.
   *       - in: query
   *         name: includeContacts
   *         schema:
   *           type: boolean
   *         description: Include contact information in the result.
   *     responses:
   *       200:
   *         description: Successfully retrieved leases.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     type: object
   *                     description: Lease details.
   *       500:
   *         description: Internal server error. Failed to retrieve leases.
   */

  const getLeasesForContactCodeQueryParamSchema = z.object({
    includeUpcomingLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeTerminatedLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeContacts: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  })

  router.get('(.*)/leases/for/contactCode/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeUpcomingLeases',
      'includeTerminatedLeases',
      'includeContacts',
    ])

    const queryParams = getLeasesForContactCodeQueryParamSchema.safeParse(
      ctx.query
    )
    if (queryParams.success === false) {
      ctx.status = 400
      return
    }

    const result = await getLeasesForContactCode(ctx.params.pnr, {
      includeUpcomingLeases: queryParams.data.includeUpcomingLeases,
      includeTerminatedLeases: queryParams.data.includeTerminatedLeases,
      includeContacts: queryParams.data.includeContacts,
    })
    if (!result.ok) {
      ctx.status = 500
      ctx.body = {
        error: result.err,
        ...metadata,
      }
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
   * /leases/for/propertyId/{propertyId}:
   *   get:
   *     summary: Get leases by property ID
   *     description: Retrieve leases associated with a property by property ID.
   *     tags: [Leases]
   *     parameters:
   *       - in: path
   *         name: propertyId
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the property.
   *       - in: query
   *         name: includeTerminatedLeases
   *         schema:
   *           type: boolean
   *         description: Include terminated leases in the result.
   *       - in: query
   *         name: includeContacts
   *         schema:
   *           type: boolean
   *         description: Include contact information in the result.
   *     responses:
   *       200:
   *         description: Successfully retrieved leases.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 content:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       leaseId:
   *                         type: string
   *                         description: Unique identifier for the lease
   *                       leaseNumber:
   *                         type: string
   *                         description: Lease reference number
   *                       leaseStartDate:
   *                         type: string
   *                         format: date-time
   *                         description: Start date of the lease
   *                       leaseEndDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: End date of the lease if applicable
   *                       status:
   *                         type: integer
   *                         enum: [0, 1, 2, 3]
   *                         description: Current status of the lease (0=Current, 1=Upcoming, 2=AboutToEnd, 3=Ended)
   *                       tenantContactIds:
   *                         type: array
   *                         items:
   *                           type: string
   *                         nullable: true
   *                         description: Array of tenant contact IDs
   *                       tenants:
   *                         type: array
   *                         items:
   *                           type: object
   *                           properties:
   *                             contactCode:
   *                               type: string
   *                               description: Unique contact code
   *                             contactKey:
   *                               type: string
   *                               description: Contact key identifier
   *                             leaseIds:
   *                               type: array
   *                               items:
   *                                 type: string
   *                               nullable: true
   *                               description: Array of associated lease IDs
   *                             firstName:
   *                               type: string
   *                               description: First name of the contact
   *                             lastName:
   *                               type: string
   *                               description: Last name of the contact
   *                             fullName:
   *                               type: string
   *                               description: Full name of the contact
   *                             nationalRegistrationNumber:
   *                               type: string
   *                               description: National registration number
   *                             birthDate:
   *                               type: string
   *                               format: date-time
   *                               description: Birth date of the contact
   *                             address:
   *                               type: object
   *                               nullable: true
   *                               properties:
   *                                 street:
   *                                   type: string
   *                                   description: Street name
   *                                 number:
   *                                   type: string
   *                                   description: Street number
   *                                 postalCode:
   *                                   type: string
   *                                   description: Postal code
   *                                 city:
   *                                   type: string
   *                                   description: City name
   *                             phoneNumbers:
   *                               type: array
   *                               nullable: true
   *                               items:
   *                                 type: object
   *                                 properties:
   *                                   phoneNumber:
   *                                     type: string
   *                                     description: Phone number
   *                                   type:
   *                                     type: string
   *                                     description: Type of phone number
   *                                   isMainNumber:
   *                                     type: boolean
   *                                     description: Whether this is the main contact number
   *                             emailAddress:
   *                               type: string
   *                               nullable: true
   *                               description: Email address
   *                             isTenant:
   *                               type: boolean
   *                               description: Whether the contact is a tenant
   *                             specialAttention:
   *                               type: boolean
   *                               nullable: true
   *                               description: Whether the contact needs special attention
   *                         nullable: true
   *                       rentalPropertyId:
   *                         type: string
   *                         description: ID of the rental property
   *                       type:
   *                         type: string
   *                         description: Type of the lease
   *                       address:
   *                         type: object
   *                         nullable: true
   *                         properties:
   *                           street:
   *                             type: string
   *                             description: Street name
   *                           number:
   *                             type: string
   *                             description: Street number
   *                           postalCode:
   *                             type: string
   *                             description: Postal code
   *                           city:
   *                             type: string
   *                             description: City name
   *                       noticeGivenBy:
   *                         type: string
   *                         nullable: true
   *                         description: Who gave the notice
   *                       noticeDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Date when notice was given
   *                       noticeTimeTenant:
   *                         type: string
   *                         nullable: true
   *                         description: Notice time for tenant
   *                       preferredMoveOutDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Preferred move out date
   *                       terminationDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Date of lease termination
   *                       contractDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Date of contract
   *                       lastDebitDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Last debit date
   *                       approvalDate:
   *                         type: string
   *                         format: date-time
   *                         nullable: true
   *                         description: Date of lease approval
   *                       residentialArea:
   *                         type: object
   *                         nullable: true
   *                         properties:
   *                           code:
   *                             type: string
   *                             description: Residential area code
   *                           caption:
   *                             type: string
   *                             description: Residential area name
   *       400:
   *         description: Bad request. Invalid query parameters.
   *       500:
   *         description: Internal server error. Failed to retrieve leases.
   */

  const getLeasesForPropertyIdQueryParamSchema = z.object({
    includeUpcomingLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeTerminatedLeases: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    includeContacts: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
  })

  router.get('(.*)/leases/for/propertyId/:propertyId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeUpcomingLeases',
      'includeTerminatedLeases',
      'includeContacts',
    ])

    const queryParams = getLeasesForPropertyIdQueryParamSchema.safeParse(
      ctx.query
    )
    if (queryParams.success === false) {
      ctx.status = 400
      return
    }

    const responseData = await getLeasesForPropertyId(ctx.params.propertyId, {
      includeUpcomingLeases: queryParams.data.includeUpcomingLeases,
      includeTerminatedLeases: queryParams.data.includeTerminatedLeases,
      includeContacts: queryParams.data.includeContacts,
    })

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * @swagger
   * /leases/{id}:
   *   get:
   *     summary: Get detailed lease by lease ID
   *     description: Retrieve lease details by lease ID.
   *     tags: [Leases]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: The ID of the lease.
   *       - in: query
   *         name: includeContacts
   *         schema:
   *           type: boolean
   *         description: Include contact information in the result.
   *     responses:
   *       200:
   *         description: Successfully retrieved lease details.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: object
   *                   description: Lease details.
   *       404:
   *         description: Lease not found.
   *       500:
   *         description: Internal server error. Failed to retrieve lease details.
   */
  router.get('(.*)/leases/:id', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['includeContacts'])
    const responseData = await getLease(
      ctx.params.id,
      ctx.query.includeContacts
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  interface CreateLeaseRequest {
    parkingSpaceId: string
    contactCode: string
    fromDate: string
    companyCode: string
  }

  /**
   * @swagger
   * /leases:
   *   post:
   *     summary: Create new lease in xpand for parking space
   *     description: Create a new lease for a parking space.
   *     tags: [Leases]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               parkingSpaceId:
   *                 type: string
   *                 description: The ID of the parking space for the lease.
   *               contactCode:
   *                 type: string
   *                 description: The contact code associated with the lease.
   *               fromDate:
   *                 type: string
   *                 format: date-time
   *                 description: The start date of the lease.
   *               companyCode:
   *                 type: string
   *                 description: The company code associated with the lease.
   *             required:
   *               - parkingSpaceId
   *               - contactCode
   *               - fromDate
   *               - companyCode
   *     responses:
   *       200:
   *         description: Lease created successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 LeaseId:
   *                   type: string
   *                   description: The ID of the newly created lease.
   *       500:
   *         description: Internal server error. Failed to create lease.
   */
  router.post('(.*)/leases', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const request = <CreateLeaseRequest>ctx.request.body

      const newLeaseId = await createLease(
        new Date(request.fromDate),
        request.parkingSpaceId,
        request.contactCode,
        request.companyCode
      )
      ctx.body = {
        content: { LeaseId: newLeaseId },
        ...metadata,
      }
    } catch (error: unknown) {
      ctx.status = 500

      if (error instanceof Error) {
        ctx.body = {
          error: error.message,
          ...metadata,
        }
      }
    }
  })
}
