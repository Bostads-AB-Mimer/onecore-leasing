import KoaRouter from '@koa/router'
import { ApplicantStatus, Listing, DetailedApplicant } from 'onecore-types'

import {
  getContactByContactCode,
  getContactByNationalRegistrationNumber,
  getContactForPhoneNumber,
  getLease,
  getLeasesForContactCode,
  getLeasesForNationalRegistrationNumber,
  getLeasesForPropertyId,
} from './adapters/xpand/tenant-lease-adapter'

import {
  applicationExists,
  createApplication,
  createListing,
  getAllListingsWithApplicants,
  getListingById,
  getListingByRentalObjectCode,
} from './adapters/listing-adapter'
import {
  addApplicantToToWaitingList,
  createLease,
  getWaitingList,
} from './adapters/xpand/xpand-soap-adapter'
import {
  addPriorityToApplicantsBasedOnRentalRules,
  getDetailedApplicantInformation,
  sortApplicantsBasedOnRentalRules,
} from './priority-list-service'

import { logger, generateRouteMetadata } from 'onecore-utilities'
import { z } from 'zod'

import { routes as offerRoutes } from './routes/offers'
import { routes as contactRoutes } from './routes/contacts'
import { routes as invoiceRoutes } from './routes/invoices'

import { parseRequestBody } from '../../middlewares/parse-request-body'

interface CreateLeaseRequest {
  parkingSpaceId: string
  contactCode: string
  fromDate: string
  companyCode: string
}

interface CreateWaitingListRequest {
  contactCode: string
  waitingListTypeCaption: string
}

export const routes = (router: KoaRouter) => {
  offerRoutes(router)
  contactRoutes(router)
  invoiceRoutes(router)
  /**
   * Returns leases for a national registration number with populated sub objects
   */
  router.get('(.*)/leases/for/nationalRegistrationNumber/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeTerminatedLeases',
      'includeContacts',
    ])
    const responseData = await getLeasesForNationalRegistrationNumber(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Returns leases for a contact code with populated sub objects
   */
  router.get('(.*)/leases/for/contactCode/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeTerminatedLeases',
      'includeContacts',
    ])
    const responseData = await getLeasesForContactCode(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )
    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Returns leases for a property id with populated sub objects
   */
  router.get('(.*)/leases/for/propertyId/:propertyId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, [
      'includeTerminatedLeases',
      'includeContacts',
    ])
    const responseData = await getLeasesForPropertyId(
      ctx.params.propertyId,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Returns a lease with populated sub objects
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

  //todo: determine if this endpoint is needed
  //todo: getting ALL contracts is not feasible in the xpand context
  //todo: passing a list of ids is not really suitable as query params?
  //todo: koa-querystring lib could solve the above problem
  /**
   * Returns all leases with populated sub objects
   */
  // router.get('(.*)/leases', async (ctx) => {
  //   const leases = await getLeases(leaseIds)
  //
  //   ctx.body = {
  //     data: leases,
  //   }
  // })

  /**
   * Gets a person by national registration number.
   */
  router.get('(.*)/contact/nationalRegistrationNumber/:pnr', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['includeTerminatedLeases'])
    const responseData = await getContactByNationalRegistrationNumber(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Gets a person by contact code.
   */
  router.get('(.*)/contact/contactCode/:contactCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx, ['includeTerminatedLeases'])
    const responseData = await getContactByContactCode(
      ctx.params.contactCode,
      ctx.query.includeTerminatedLeases
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Gets a person by phone number.
   */
  router.get('(.*)/contact/phoneNumber/:phoneNumber', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const responseData = await getContactForPhoneNumber(
      ctx.params.phoneNumber
      //ctx.query.includeTerminatedLeases /TODO: Implement this?
    )

    ctx.body = {
      content: responseData,
      ...metadata,
    }
  })

  /**
   * Creates or updates a lease.
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

  /**
   * Creates a new listing.
   */
  //todo: test cases to write:
  //can add listing
  //cannot add duplicate listing
  router.post('(.*)/listings', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingData = <Listing>ctx.request.body
      const existingListing = await getListingByRentalObjectCode(
        listingData.rentalObjectCode
      )
      if (
        existingListing != null &&
        existingListing.rentalObjectCode === listingData.rentalObjectCode
      ) {
        ctx.status = 409
        ctx.body = { reason: 'Listing already exists.', ...metadata }
        return
      }

      const listing = await createListing(listingData)

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
   * Endpoint to apply for a listing.
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

        const exists = await applicationExists(
          applicantData.contactCode,
          applicantData.listingId
        )

        if (exists) {
          ctx.status = 409 // Conflict
          ctx.body = {
            error: 'Applicant has already applied for this listing.',
            ...metadata,
          }
          return
        }

        const applicationId = await createApplication(applicantData)
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

  router.get('/listings/by-id/:listingId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingId = ctx.params.listingId
      const listing = await getListingById(listingId)
      if (listing == undefined) {
        ctx.status = 404
        ctx.body = { reason: 'Listing not found', ...metadata }
        return
      }

      ctx.body = { conrent: listing, ...metadata }
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

  router.get('/listings/by-code/:rentalObjectCode', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const rentaLObjectCode = ctx.params.rentalObjectCode
      const listing = await getListingByRentalObjectCode(rentaLObjectCode)
      if (listing == undefined) {
        ctx.status = 404
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

  router.get('/listings-with-applicants', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingsWithApplicants = await getAllListingsWithApplicants()
      ctx.body = { content: listingsWithApplicants, ...metadata }
      ctx.status = 200
    } catch (error) {
      logger.error(error, 'Error fetching listings with applicants:')
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while fetching listings with applicants.',
        ...metadata,
      }
    }
  })

  /**
   * Gets the waiting lists of a person.
   */
  router.get(
    '(.*)/contact/waitingList/:nationalRegistrationNumber',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      try {
        const responseData = await getWaitingList(
          ctx.params.nationalRegistrationNumber
        )
        ctx.status = 201
        ctx.body = {
          content: responseData,
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

  /**
   * Adds a person to the specified waiting list.
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
          message: 'Contact added to waiting list',
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
   * Gets detailed information on a listings applicants
   * Returns a sorted list by rental rules for internal parking spaces of all applicants on a listing by listing id
   * Uses ListingId instead of rentalObjectCode since multiple listings can share the same rentalObjectCode for historical reasons
   */
  router.get('(.*)/listing/:listingId/applicants/details', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    try {
      const listingId = ctx.params.listingId
      const listing = await getListingById(listingId)

      if (!listing) {
        ctx.status = 404
        ctx.body = {
          error: 'Listing not found',
          ...metadata,
        }
        return
      }

      const applicants: DetailedApplicant[] = []

      if (listing.applicants) {
        for (const applicant of listing.applicants) {
          const detailedApplicant =
            await getDetailedApplicantInformation(applicant)
          applicants.push(detailedApplicant)
        }
      }

      const applicantsWithPriority = addPriorityToApplicantsBasedOnRentalRules(
        listing,
        applicants
      )

      ctx.body = {
        content: sortApplicantsBasedOnRentalRules(applicantsWithPriority),
        ...metadata,
      }
    } catch (error: unknown) {
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
}
