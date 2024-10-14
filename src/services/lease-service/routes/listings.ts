import KoaRouter from '@koa/router'
import {
  Address,
  Applicant,
  ApplicantStatus,
  DetailedApplicant,
  InternalParkingSpaceSyncSuccessResponse,
  Lease,
  Listing,
} from 'onecore-types'
import { z } from 'zod'
import { generateRouteMetadata, logger } from 'onecore-utilities'

import { parseRequestBody } from '../../../middlewares/parse-request-body'
import * as priorityListService from '../priority-list-service'
import * as syncParkingSpacesFromXpandService from '../sync-internal-parking-space-listings-from-xpand'
import * as listingAdapter from '../adapters/listing-adapter'
import { getTenant, NewTenant, TenantHousingContractInfo } from '../get-tenant'

/**
 * @swagger
 * tags:
 *   - name: Listings
 *     description: Endpoints related to Listing operations
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /listings:
   *   post:
   *     summary: Create new listing
   *     description: Create a new listing.
   *     tags: [Listings]
   *     requestBody:
   *       required: true
   *       content:
   *          application/json:
   *             schema:
   *               type: object
   *     responses:
   *       201:
   *         description: Listing created successfully.
   *         content:
   *          application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       409:
   *         description: Conflict. Listing with the same rentalObjectCode already exists.
   *       500:
   *         description: Internal server error. Failed to create listing.
   */
  //todo: test cases to write:
  //can add listing
  //cannot add duplicate listing
  router.post('(.*)/listings', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingData = <Listing>ctx.request.body
      const existingListing = await listingAdapter.getListingByRentalObjectCode(
        listingData.rentalObjectCode
      )
      if (
        existingListing != null &&
        existingListing.rentalObjectCode === listingData.rentalObjectCode
      ) {
        ctx.status = 409
        ctx.body = {
          error: 'Listing with the same rentalObjectCode already exists.',
          ...metadata,
        }
        return
      }

      const listing = await listingAdapter.createListing(listingData)

      ctx.status = 201 // HTTP status code for Created
      ctx.body = { content: listing, ...metadata }
    } catch (error) {
      ctx.status = 500 // Internal Server Error

      if (error instanceof Error) {
        ctx.body = { error: error.message, ...metadata }
      } else {
        ctx.body = { error: 'An unexpected error occurred.', ...metadata }
      }
    }
  })

  const CreateApplicantRequestParamsSchema = z.object({
    name: z.string(),
    nationalRegistrationNumber: z.string(),
    contactCode: z.string(),
    applicationDate: z.coerce.date(),
    applicationType: z.string().optional(),
    status: z.nativeEnum(ApplicantStatus),
    listingId: z.number(),
  })

  /**
   * @swagger
   * components:
   *   schemas:
   *     CreateApplicantRequestParams:
   *       type: object
   *       required:
   *         - name
   *         - nationalRegistrationNumber
   *         - contactCode
   *         - applicationDate
   *         - status
   *         - listingId
   *       properties:
   *         name:
   *           type: string
   *           description: The name of the applicant.
   *         nationalRegistrationNumber:
   *           type: string
   *           description: The national registration number of the applicant.
   *         contactCode:
   *           type: string
   *           description: The contact code of the applicant.
   *         applicationDate:
   *           type: string
   *           format: date-time
   *           description: The date when the application was submitted.
   *         applicationType:
   *           type: string
   *           description: The type of application (optional).
   *         status:
   *           type: string
   *           enum:
   *             - PENDING
   *             - APPROVED
   *             - REJECTED
   *             - WITHDRAWN_BY_USER
   *             - WITHDRAWN_BY_ADMIN
   *           description: The status of the applicant.
   *         listingId:
   *           type: number
   *           description: The ID of the listing to which the applicant is applying.
   *     Error:
   *       type: object
   *       properties:
   *         error:
   *           type: string
   *
   * /listings/apply:
   *   post:
   *     summary: Create new application for contact on listing
   *     description: Apply for a listing.
   *     tags: [Listings]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateApplicantRequestParams'
   *     responses:
   *       201:
   *        content:
   *          application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       409:
   *         description: Conflict. Applicant has already applied for this listing.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Internal server error. Failed to create application.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  //todo: test cases to write:
  //can add applicant
  //cannot add duplicate applicant
  //handle non existing applicant contact code
  router.post(
    '(.*)/listings/apply',
    parseRequestBody(CreateApplicantRequestParamsSchema),
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      try {
        const applicantData = ctx.request.body

        const exists = await listingAdapter.applicationExists(
          applicantData.contactCode,
          applicantData.listingId
        )

        if (exists) {
          ctx.status = 409 // Conflict
          ctx.body = {
            reason: 'Applicant has already applied for this listing.',
            ...metadata,
          }
          return
        }

        //todo: createApplication does not actually return any data
        const applicationId =
          await listingAdapter.createApplication(applicantData)
        ctx.status = 201 // HTTP status code for Created
        ctx.body = { content: applicationId, ...metadata }
      } catch (error) {
        ctx.status = 500 // Internal Server Error
        if (error instanceof Error) {
          ctx.body = { error: error.message, ...metadata }
        } else {
          ctx.body = { error: 'An unexpected error occurred.', ...metadata }
        }
      }
    }
  )

  /**
   * @swagger
   * /listings/by-id/{listingId}:
   *   get:
   *     summary: Get a listing by ID
   *     description: Fetches a listing from the database using its ID.
   *     tags:
   *       - Listings
   *     parameters:
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the listing to fetch.
   *     responses:
   *       '200':
   *         description: Successfully retrieved listing.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   description: The ID of the listing.
   *                 name:
   *                   type: string
   *                   description: The name of the listing.
   *       '404':
   *         description: Listing not found.
   *       '500':
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: The error message.
   */
  router.get('/listings/by-id/:listingId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingId = ctx.params.listingId
      const listing = await listingAdapter.getListingById(Number(listingId))
      if (listing == undefined) {
        ctx.status = 404
        ctx.body = { reason: 'Listing not found', ...metadata }
        return
      }

      ctx.body = { content: listing, ...metadata }
      ctx.status = 200
    } catch (error) {
      logger.error(error, 'Error fetching listing: ' + ctx.params.listingId)
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error:
          'An error occurred while fetching listing with the provided listingId: ' +
          ctx.params.listingId,
        ...metadata,
      }
    }
  })

  /**
   * @swagger
   * /listings/by-code/{rentalObjectCode}:
   *   get:
   *     summary: Get a listing by Rental Object Code
   *     description: Fetches a listing from the database using its Rental Object Code.
   *     tags:
   *       - Listings
   *     parameters:
   *       - in: path
   *         name: rentalObjectCode
   *         required: true
   *         schema:
   *           type: string
   *         description: Rental Object Code of the listing to fetch.
   *     responses:
   *       '200':
   *         description: Successfully retrieved listing.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   description: The ID of the listing.
   *                 name:
   *                   type: string
   *                   description: The name of the listing.
   *       '404':
   *         description: Listing not found.
   *       '500':
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: The error message.
   */
  router.get('/listings/by-code/:rentalObjectCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const rentaLObjectCode = ctx.params.rentalObjectCode
      const listing =
        await listingAdapter.getListingByRentalObjectCode(rentaLObjectCode)
      if (listing == undefined) {
        ctx.status = 404
        ctx.body = { reason: 'Listing not found', ...metadata }
        return
      }

      ctx.body = { content: listing, ...metadata }
      ctx.status = 200
    } catch (error) {
      logger.error(
        error,
        'Error fetching listing: ' + ctx.params.rentalObjectCode
      )
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error:
          'An error occurred while fetching listing with the provided rentalObjectCode: ' +
          ctx.params.rentalObjectCode,
        ...metadata,
      }
    }
  })

  /**
   * @swagger
   * /listings-with-applicants:
   *   get:
   *     summary: Get listings with applicants
   *     description: Fetches all listings that have associated applicants.
   *     tags:
   *       - Listings
   *     responses:
   *       '200':
   *         description: Successfully retrieved listings with applicants.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                     description: The ID of the listing.
   *                   name:
   *                     type: string
   *                     description: The name of the listing.
   *                   applicants:
   *                     type: array
   *                     items:
   *                       type: object
   *                       properties:
   *                         id:
   *                           type: string
   *                           description: The ID of the applicant.
   *                         name:
   *                           type: string
   *                           description: The name of the applicant.
   *       '500':
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: The error message.
   */
  router.get('/listings-with-applicants', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingsWithApplicants =
        await listingAdapter.getAllListingsWithApplicants()
      ctx.status = 200
      ctx.body = { content: listingsWithApplicants, ...metadata }
    } catch (error) {
      logger.error(error, 'Error fetching listings with applicants:')
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while fetching listings with applicants.',
        ...metadata,
      }
    }
  })

  router.post('/listings/sync-internal-from-xpand', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const result =
      await syncParkingSpacesFromXpandService.syncInternalParkingSpaces()

    if (!result.ok) {
      logger.error(
        'Error when syncing internal parking spaces from Xpand SOAP API'
      )

      ctx.status = 500
      ctx.body = { err: 'Internal server error', ...metadata }
      return
    }

    logger.info('Finished syncing listings from Xpand SOAP API')
    if (result.data.insertions.failed.length) {
      logger.info(
        result.data.insertions.failed.map((v) => ({
          rentalObjectCode: v.listing.rentalObjectCode,
          status: v.listing.status,
          err: v.err,
        })),
        'Failed to insert the following listings when syncing from Xpand SOAP API:'
      )
    }

    const mapToResponseData = (
      data: (typeof result)['data']
    ): InternalParkingSpaceSyncSuccessResponse => ({
      invalid: result.data.invalid,
      insertions: {
        inserted: data.insertions.inserted.map((v) => ({
          id: v.id,
          rentalObjectCode: v.rentalObjectCode,
        })),
        failed: data.insertions.failed.map((v) => ({
          rentalObjectCode: v.listing.rentalObjectCode,
          err:
            v.err === 'conflict-active-listing'
              ? 'active-listing-exists'
              : v.err,
        })),
      },
    })

    ctx.status = 200
    ctx.body = {
      content: mapToResponseData(result.data),
      ...metadata,
    }
  })

  /**
   * Gets detailed information on a listings applicants
   * Returns a sorted list by rental rules for internal parking spaces of all applicants on a listing by listing id
   * Uses ListingId instead of rentalObjectCode since multiple listings can share the same rentalObjectCode for historical reasons
   */
  /**
   * @swagger
   * /listing/{listingId}/applicants/details:
   *   get:
   *     summary: Get detailed applicant information for a listing
   *     description: Fetches detailed information about applicants for a specific listing.
   *     tags:
   *       - Listings
   *     parameters:
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID of the listing for which applicants details are requested.
   *     responses:
   *       '200':
   *         description: Successfully retrieved detailed applicants information.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   id:
   *                     type: string
   *                     description: The ID of the applicant.
   *                   name:
   *                     type: string
   *                     description: The name of the applicant.
   *       '404':
   *         description: Listing not found.
   *       '500':
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: The error message.
   */

  type DetailedApplicant3 = Applicant & {
    queuePoints: number
    address?: Address
    parkingSpaceContracts?: Lease[]
    priority?: number
  } & TenantHousingContractInfo

  router.get('(.*)/listing/:listingId/applicants/details', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingId = ctx.params.listingId
      const listing = await listingAdapter.getListingById(Number(listingId))

      if (!listing) {
        ctx.status = 404
        ctx.body = {
          reason: 'Listing not found',
          ...metadata,
        }
        return
      }

      if (!listing.applicants) {
        ctx.status = 200
        ctx.body = {
          content: [],
          ...metadata,
        }

        return
      }

      const applicants = await Promise.all(
        listing.applicants.map(async (applicant) => {
          const tenant = await getTenant({
            contactCode: applicant.contactCode,
          })

          if (!tenant.ok) {
            throw new Error(
              'Err when getting detailed applicant information: ' + tenant.err
            )
          }

          return mapTenantToDetailedApplicant(tenant.data, applicant)
        })
      )

      const applicantsWithPriority =
        priorityListService.addPriorityToApplicantsBasedOnRentalRules(
          listing,
          applicants
        )

      ctx.status = 200
      ctx.body = {
        content: priorityListService.sortApplicantsBasedOnRentalRules(
          applicantsWithPriority
        ),
        ...metadata,
      }
    } catch (error) {
      logger.error(error, 'Error getting applicants for waiting list')
      ctx.status = 500

      if (error instanceof Error) {
        ctx.body = {
          error: error.message,
          ...metadata,
        }
      }
    }
  })

  const mapTenantToDetailedApplicant = (
    tenant: NewTenant,
    applicant: Applicant
  ): DetailedApplicant3 => {
    if (tenant.type === 'current') {
      return {
        ...applicant,
        type: 'current',
        contactCode: tenant.contactCode,
        nationalRegistrationNumber: tenant.nationalRegistrationNumber,
        queuePoints: tenant.queuePoints,
        address: tenant.address,
        currentHousingContract: tenant.currentHousingContract,
        upcomingHousingContract: tenant.upcomingHousingContract,
        parkingSpaceContracts: tenant.parkingSpaceContracts,
      }
    } else {
      return {
        ...applicant,
        type: 'upcoming',
        contactCode: tenant.contactCode,
        nationalRegistrationNumber: tenant.nationalRegistrationNumber,
        queuePoints: tenant.queuePoints,
        address: tenant.address,
        upcomingHousingContract: tenant.upcomingHousingContract,
        parkingSpaceContracts: tenant.parkingSpaceContracts,
      }
    }
  }

  /**
   * @swagger
   * /listings/{listingId}:
   *   delete:
   *     summary: Delete a Listing by ID
   *     description: Deletes a listing by it's ID.
   *     tags:
   *       - Listings
   *     parameters:
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: number
   *         description: ID of the listing to delete.
   *     responses:
   *       '200':
   *         description: Successfully deleted listing.
   *       '409':
   *         description: Conflict.
   *       '500':
   *         description: Internal server error.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   description: The error message.
   */
  router.delete('(.*)/listings/:listingId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const result = await listingAdapter.deleteListing(
      Number(ctx.params.listingId)
    )

    if (!result.ok) {
      if (result.err === 'conflict') {
        ctx.status = 409
        ctx.body = { reason: 'Could not delete listing.', ...metadata }
        return
      }
      ctx.status = 500
      ctx.body = { error: 'Internal server error', ...metadata }
      return
    }

    ctx.status = 200
    ctx.body = { ...metadata }
  })
}
