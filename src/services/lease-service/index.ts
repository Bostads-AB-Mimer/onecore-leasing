import KoaRouter from '@koa/router'
import {
  Applicant,
  ApplicantStatus,
  Listing,
  DetailedApplicant,
} from 'onecore-types'

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
  getApplicantById,
  getApplicantsByContactCode,
  getApplicantByContactCodeAndListingId,
  getListingById,
  getListingByRentalObjectCode,
  updateApplicantStatus,
} from './adapters/listing-adapter'
import {
  addApplicantToToWaitingList,
  createLease,
  getWaitingList,
} from './adapters/xpand/xpand-soap-adapter'
import {
  getInvoicesByContactCode,
  getUnpaidInvoicesByContactCode,
} from './adapters/xpand/invoices-adapter'
import {
  addPriorityToApplicantsBasedOnRentalRules,
  getDetailedApplicantInformation,
  sortApplicantsBasedOnRentalRules,
} from './priority-list-service'

import { routes as offerRoutes } from './offers'
import {
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  doesUserHaveHousingContractInSamePropertyAsListing,
  isHousingContractsOfApplicantInSameAreaAsListing,
  isListingInAreaWithSpecificRentalRules,
} from './rental-rules-validator'
import { getPropertyInfoFromCore } from './adapters/core-adapter'
import { HttpStatusCode } from 'axios'

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
  /**
   * Returns leases for a national registration number with populated sub objects
   */
  router.get('(.*)/leases/for/nationalRegistrationNumber/:pnr', async (ctx) => {
    const responseData = await getLeasesForNationalRegistrationNumber(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Returns leases for a contact code with populated sub objects
   */
  router.get('(.*)/leases/for/contactCode/:pnr', async (ctx) => {
    const responseData = await getLeasesForContactCode(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )
    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Returns leases for a property id with populated sub objects
   */
  router.get('(.*)/leases/for/propertyId/:propertyId', async (ctx) => {
    const responseData = await getLeasesForPropertyId(
      ctx.params.propertyId,
      ctx.query.includeTerminatedLeases,
      ctx.query.includeContacts
    )

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Returns a lease with populated sub objects
   */
  router.get('(.*)/leases/:id', async (ctx) => {
    const responseData = await getLease(
      ctx.params.id,
      ctx.query.includeContacts
    )

    ctx.body = {
      data: responseData,
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
    const responseData = await getContactByNationalRegistrationNumber(
      ctx.params.pnr,
      ctx.query.includeTerminatedLeases
    )

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Gets a person by contact code.
   */
  router.get('(.*)/contact/contactCode/:contactCode', async (ctx) => {
    const responseData = await getContactByContactCode(
      ctx.params.contactCode,
      ctx.query.includeTerminatedLeases
    )

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Gets a person by phone number.
   */
  router.get('(.*)/contact/phoneNumber/:phoneNumber', async (ctx) => {
    const responseData = await getContactForPhoneNumber(
      ctx.params.phoneNumber
      //ctx.query.includeTerminatedLeases /TODO: Implement this?
    )

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Gets all invoices for a contact, filtered on paid and unpaid.
   */
  router.get('(.*)/contact/invoices/contactCode/:contactCode', async (ctx) => {
    const responseData = await getInvoicesByContactCode(ctx.params.contactCode)

    ctx.body = {
      data: responseData,
    }
  })

  /**
   * Gets the detailed status of a persons unpaid invoices.
   */
  router.get(
    '(.*)/contact/unpaidInvoices/contactCode/:contactCode',
    async (ctx) => {
      const responseData = await getUnpaidInvoicesByContactCode(
        ctx.params.contactCode
      )

      ctx.body = {
        data: responseData,
      }
    }
  )

  /**
   * Creates or updates a lease.
   */
  router.post('(.*)/leases', async (ctx) => {
    try {
      const request = <CreateLeaseRequest>ctx.request.body

      const newLeaseId = await createLease(
        new Date(request.fromDate),
        request.parkingSpaceId,
        request.contactCode,
        request.companyCode
      )
      ctx.body = {
        LeaseId: newLeaseId,
      }
    } catch (error: unknown) {
      ctx.status = 500

      if (error instanceof Error) {
        ctx.body = {
          error: error.message,
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
        return
      }

      const listing = await createListing(listingData)

      ctx.status = 201 // HTTP status code for Created
      ctx.body = listing
    } catch (error) {
      ctx.status = 500 // Internal Server Error

      if (error instanceof Error) {
        ctx.body = { error: error.message }
      } else {
        ctx.body = { error: 'An unexpected error occurred.' }
      }
    }
  })

  /**
   * Endpoint to apply for a listing.
   */
  //todo: test cases to write:
  //can add applicant
  //cannot add duplicate applicant
  //handle non existing applicant contact code

  router.post('(.*)/listings/apply', async (ctx) => {
    try {
      const applicantData = <Applicant>ctx.request.body

      const exists = await applicationExists(
        applicantData.contactCode,
        applicantData.listingId
      )
      if (exists) {
        ctx.status = 409 // Conflict
        ctx.body = { error: 'Applicant has already applied for this listing.' }
        return
      }

      const applicationId = await createApplication(applicantData)
      ctx.status = 201 // HTTP status code for Created
      ctx.body = { applicationId }
    } catch (error) {
      ctx.status = 500 // Internal Server Error
      if (error instanceof Error) {
        ctx.body = { error: error.message }
      } else {
        ctx.body = { error: 'An unexpected error occurred.' }
      }
    }
  })

  router.get('/listings/by-id/:listingId', async (ctx) => {
    try {
      const listingId = ctx.params.listingId
      const listing = await getListingById(listingId)
      if (listing == undefined) {
        ctx.status = 404
        return
      }

      ctx.body = listing
      ctx.status = 200
    } catch (error) {
      console.error('Error fetching listing:', ctx.params.listingId, error)
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error:
          'An error occurred while fetching listing with the provided listingId: ' +
          ctx.params.listingId,
      }
    }
  })

  router.get('/listings/by-code/:rentalObjectCode', async (ctx) => {
    try {
      const rentaLObjectCode = ctx.params.rentalObjectCode
      const listing = await getListingByRentalObjectCode(rentaLObjectCode)
      if (listing == undefined) {
        ctx.status = 404
        return
      }

      ctx.body = listing
      ctx.status = 200
    } catch (error) {
      console.error(
        'Error fetching listing:',
        ctx.params.rentalObjectCode,
        error
      )
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error:
          'An error occurred while fetching listing with the provided rentalObjectCode: ' +
          ctx.params.rentalObjectCode,
      }
    }
  })

  router.get('/listings-with-applicants', async (ctx) => {
    try {
      const listingsWithApplicants = await getAllListingsWithApplicants()
      ctx.body = listingsWithApplicants
      ctx.status = 200
    } catch (error) {
      console.error('Error fetching listings with applicants:', error)
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while fetching listings with applicants.',
      }
    }
  })

  router.get('/applicants/:contactCode/', async (ctx) => {
    const { contactCode } = ctx.params // Extracting from URL parameters
    try {
      const applicants = await getApplicantsByContactCode(contactCode)
      ctx.body = applicants
      ctx.status = 200

      if (!applicants) {
        ctx.status = 404 // Not Found
        ctx.body = {
          error: 'Applicant not found for the provided contactCode.',
        }
      } else {
        ctx.status = 200 // OK
        ctx.body = applicants
      }
    } catch (error) {
      console.error('Error fetching applicant by contactCode:', error)
      ctx.status = 500 // Internal Server Error
      ctx.body = { error: 'An error occurred while fetching the applicant.' }
    }
  })

  router.get('/applicants/:contactCode/:listingId', async (ctx) => {
    const { contactCode, listingId } = ctx.params // Extracting from URL parameters
    try {
      const applicant = await getApplicantByContactCodeAndListingId(
        contactCode,
        parseInt(listingId)
      )
      ctx.body = applicant
      ctx.status = 200

      if (!applicant) {
        ctx.status = 404 // Not Found
        ctx.body = {
          error:
            'Applicant not found for the provided contactCode and listingId.',
        }
      } else {
        ctx.status = 200 // OK
        ctx.body = applicant
      }
    } catch (error) {
      console.error(
        'Error fetching applicant by contactCode and listingId:',
        error
      )
      ctx.status = 500 // Internal Server Error
      ctx.body = { error: 'An error occurred while fetching the applicant.' }
    }
  })

  router.patch('/applicants/:id/status', async (ctx) => {
    const { id } = ctx.params
    const { status, contactCode } = ctx.request.body as any

    try {
      //if the applicant is withdrawn by the user, make sure the application belongs to that particular user
      if (status == ApplicantStatus.WithdrawnByUser) {
        const applicant = await getApplicantById(Number(id))
        if (applicant?.contactCode != contactCode) {
          ctx.status = 404
          ctx.body = { error: 'Applicant not found for this contactCode' }
          return
        }
      }

      const applicantUpdated = await updateApplicantStatus(Number(id), status)
      if (applicantUpdated) {
        ctx.status = 200
        ctx.body = { message: 'Applicant status updated successfully' }
      } else {
        ctx.status = 404
        ctx.body = { error: 'Applicant not found' }
      }
    } catch (error) {
      console.error('Error updating applicant status:', error)
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while updating the applicant status.',
      }
    }
  })

  /**
   * Gets the waiting lists of a person.
   */
  router.get(
    '(.*)/contact/waitingList/:nationalRegistrationNumber',
    async (ctx) => {
      try {
        const responseData = await getWaitingList(
          ctx.params.nationalRegistrationNumber
        )

        ctx.body = {
          data: responseData,
        }
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
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
      const request = <CreateWaitingListRequest>ctx.request.body
      try {
        await addApplicantToToWaitingList(
          ctx.params.nationalRegistrationNumber,
          request.contactCode,
          request.waitingListTypeCaption
        )

        ctx.status = 201
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
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
    try {
      const listingId = ctx.params.listingId
      const listing = await getListingById(listingId)

      if (!listing) {
        ctx.status = 404
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

      ctx.body = sortApplicantsBasedOnRentalRules(applicantsWithPriority)
    } catch (error: unknown) {
      ctx.status = 500

      if (error instanceof Error) {
        ctx.body = {
          error: error.message,
        }
      }
    }
  })

  router.get(
    '(.*)/applicants/validateResidentialAreaRentalRules/:contactCode/:listingId',
    async (ctx) => {
      try {
        const { contactCode, listingId } = ctx.params // Extracting from URL parameters
        const listing = await getListingById(listingId)

        if (listing == undefined) {
          ctx.status = 404
          ctx.body = {
            reason: 'Listing was not found',
          }
          return
        }

        if (!isListingInAreaWithSpecificRentalRules(listing)) {
          //special residential area rental rules does not apply to this listing
          ctx.body = {
            reason: 'No residential area rental rules applies to this listing',
          }
          ctx.status = 200
          return
        }

        const applicant = await getApplicantByContactCodeAndListingId(
          contactCode,
          parseInt(listingId)
        )

        if (applicant == undefined) {
          ctx.status = 404
          ctx.body = {
            reason: 'Applicant was not found',
          }
          return
        }

        const detailedApplicant =
          await getDetailedApplicantInformation(applicant)
        //validate listing area specific rental rules
        if (
          !isHousingContractsOfApplicantInSameAreaAsListing(
            listing,
            detailedApplicant
          )
        ) {
          // applicant does not have a housing contract in the same area as the listing
          ctx.body = {
            reason:
              'User does not have any current or upcoming housing contracts in the residential area',
          }
          ctx.status = 403
          return
        }

        const doesUserHaveExistingParkingSpaceInSameAreaAsListing =
          doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
            listing,
            detailedApplicant
          )

        if (!doesUserHaveExistingParkingSpaceInSameAreaAsListing) {
          //applicant is eligible for parking space, applicationType for application should be 'additonal'
          ctx.body = {
            reason:
              'User does not have any active parking space contracts in the listings residential area',
          }
          ctx.status = 203 //??
          return
        }

        //applicant have an active parking space contract in the same area as the listing
        //only option is to replace that parking space contract
        ctx.body = {
          reason:
            'User already have an active parking space contract in the listings residential area',
        }
        ctx.status = 409
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          console.log(error.message)
          ctx.body = {
            error: error.message,
          }
        }
      }
    }
  )

  router.get(
    '(.*)/applicants/validatePropertyRentalRules/:contactCode/:listingId',
    async (ctx) => {
      try {
        const { contactCode, listingId } = ctx.params // Extracting from URL parameters
        const listing = await getListingById(listingId)
        if (listing == undefined) {
          ctx.status = 404
          ctx.body = {
            reason: 'Listing was not found',
          }
          return
        }

        const listingPropertyInfo = await getPropertyInfoFromCore(
          listing.rentalObjectCode
        )

        if (listingPropertyInfo.status != HttpStatusCode.Ok) {
          ctx.status = listingPropertyInfo.status
          ctx.body = {
            reason: 'Property info for listing was not found',
          }
          return
        }

        if (
          !doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(
            listingPropertyInfo.data.estateCode
          )
        ) {
          //special property rental rules does not apply to this listing
          ctx.body = {
            reason: 'No property rental rules applies to this listing',
          }
          ctx.status = 200
          return
        }

        const applicant = await getApplicantByContactCodeAndListingId(
          contactCode,
          parseInt(listingId)
        )

        if (applicant == undefined) {
          ctx.status = 404
          ctx.body = {
            reason: 'Applicant was not found',
          }
          return
        }

        const detailedApplicant =
          await getDetailedApplicantInformation(applicant)

        //1. fetch the estateCode for the applicant's current or upcoming housing contract
        //2. check that the housing contract(s) matches the listings estate code
        //3. if not, the user cannot apply for the parking space
        //todo: a better future scenario is to include the estate code in onecore database(s)
        //todo: a lot of this code could be simplified if we did not need to round trip to xpand to get the estate code
        const applicantHasHousingContractInSamePropertyAsListing =
          await doesUserHaveHousingContractInSamePropertyAsListing(
            detailedApplicant,
            listingPropertyInfo
          )

        if (!applicantHasHousingContractInSamePropertyAsListing) {
          ctx.body = {
            reason:
              'Applicant is not a current or coming tenant in the property',
          }
          ctx.status = 403
          return
        }

        //if applicant has no parking space contracts but is a tenant in the property
        if (
          !detailedApplicant.parkingSpaceContracts ||
          detailedApplicant.parkingSpaceContracts.length == 0
        ) {
          //applicant is eligible for parking space, applicationType for application should be 'additonal'
          ctx.body = {
            reason:
              'User does not have any active parking space contracts in the listings residential area',
          }
          ctx.status = 403
          return
        }

        //1. fetch the estateCode for each of the applicant's parking space contracts
        //validation:
        //2. Check if any of the users parking space contracts matches the listings estate code
        //3. if any parking space contract matches the listing estatecode, user needs to replace that parking space contract
        //4. else, the user can apply with applicationType 'additional'

        let applicantNeedsToReplaceContractToBeAbleToApply = false
        for (const parkingSpaceContract of detailedApplicant.parkingSpaceContracts) {
          //
          const parkingSpacePropertyInfo = await getPropertyInfoFromCore(
            parkingSpaceContract.rentalPropertyId
          )

          if (
            listingPropertyInfo.data.estateCode ==
            parkingSpacePropertyInfo.data.estateCode
          ) {
            applicantNeedsToReplaceContractToBeAbleToApply = true
            break
          }
        }

        if (applicantNeedsToReplaceContractToBeAbleToApply) {
          //applicant have an active parking space contract in the same property as the listing
          //only option is to replace that parking space contract
          ctx.body = {
            reason:
              'User already have an active parking space contract in the listings residential area',
          }
          ctx.status = 409
          return
        }

        //user has parking space contracts but none in the same property as the listing
        ctx.body = {
          reason:
            'User does not have any active parking space contracts in the listings residential area',
        }
        ctx.status = 403
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          ctx.body = {
            error: error.message,
          }
        }
      }
    }
  )
}
