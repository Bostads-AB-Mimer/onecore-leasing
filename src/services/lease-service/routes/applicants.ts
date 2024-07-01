import KoaRouter from '@koa/router'
import { z } from 'zod'
import { ApplicantStatus } from 'onecore-types'
import { logger } from 'onecore-utilities'

import {
  getApplicantByContactCodeAndListingId,
  getApplicantById,
  getApplicantsByContactCode,
  getListingById,
  updateApplicantStatus,
} from '../adapters/listing-adapter'
import { getEstateCodeFromXpandByRentalObjectCode } from '../adapters/xpand/estate-code-adapter'
import {
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  doesUserHaveHousingContractInSamePropertyAsListing,
} from '../property-rental-rules-validator'
import { getTenant } from '../priority-list-service'
import {
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  isHousingContractsOfApplicantInSameAreaAsListing,
  isListingInAreaWithSpecificRentalRules,
} from '../residential-area-rental-rules-validator'
import { parseRequestBody } from '../../../middlewares/parse-request-body'

export const routes = (router: KoaRouter) => {
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
      logger.error(error, 'Error fetching applicant by contactCode:')
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
      logger.error(
        error,
        'Error fetching applicant by contactCode and rentalObjectCode:'
      )
      ctx.status = 500 // Internal Server Error
      ctx.body = { error: 'An error occurred while fetching the applicant.' }
    }
  })

  const updateApplicantStatusParams = z.object({
    status: z.nativeEnum(ApplicantStatus),
    contactCode: z.string(),
  })

  router.patch(
    '/applicants/:id/status',
    parseRequestBody(updateApplicantStatusParams),
    async (ctx) => {
      const { id } = ctx.params
      const { status, contactCode } = ctx.request.body

      try {
        //if the applicant is withdrawn by the user, make sure the application belongs to that particular user
        if (status === ApplicantStatus.WithdrawnByUser) {
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
        logger.error(error, 'Error updating applicant status')
        ctx.status = 500 // Internal Server Error
        ctx.body = {
          error: 'An error occurred while updating the applicant status.',
        }
      }
    }
  )

  router.get(
    '(.*)/applicants/validatePropertyRentalRules/:contactCode/:listingId',
    async (ctx) => {
      try {
        const { contactCode, listingId } = ctx.params
        const listing = await getListingById(listingId)
        if (!listing) {
          ctx.status = 404
          ctx.body = {
            reason: 'Listing was not found',
          }
          return
        }

        const listingEstateCode =
          await getEstateCodeFromXpandByRentalObjectCode(
            listing.rentalObjectCode
          )

        if (!listingEstateCode) {
          ctx.status = 404
          ctx.body = {
            reason: 'Property info for listing was not found',
          }
          return
        }

        if (
          !doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(
            listingEstateCode
          )
        ) {
          ctx.status = 200
          ctx.body = {
            reason: 'No property rental rules applies to this listing',
          }
          return
        }

        const contact = await getTenant({ contactCode })

        if (!contact.ok) {
          ctx.status = 500
          ctx.body = 'Internal Error'
          return
        }

        //1. fetch the estateCode for the applicant's current or upcoming housing contract
        //2. check that the housing contract(s) matches the listings estate code
        //3. if not, the user cannot apply for the parking space
        //todo: a better future scenario is to include the estate code in onecore database(s)
        //todo: a lot of this code could be simplified if we did not need to round trip to xpand to get the estate code
        const subjectHasHousingContractInSamePropertyAsListing =
          await doesUserHaveHousingContractInSamePropertyAsListing(
            contact.data,
            listingEstateCode
          )

        if (!subjectHasHousingContractInSamePropertyAsListing) {
          ctx.status = 403
          ctx.body = {
            reason:
              'Applicant is not a current or coming tenant in the property',
          }
          return
        }

        //if subject has no parking space contracts but is a tenant in the property
        if (
          !contact.data.parkingSpaceContracts ||
          !contact.data.parkingSpaceContracts?.length
        ) {
          //subject is eligible for parking space, applicationType for application should be 'additonal'
          ctx.status = 403
          ctx.body = {
            reason:
              'User does not have any active parking space contracts in the listings residential area',
          }
          return
        }

        //1. fetch the estateCode for each of the applicant's parking space contracts
        //validation:
        //2. Check if any of the users parking space contracts matches the listings estate code
        //3. if any parking space contract matches the listing estatecode, user needs to replace that parking space contract
        //4. else, the user can apply with applicationType 'additional'

        //todo: refactor and move to property rules validator?
        let subjectNeedsToReplaceContractToBeAbleToApply = false
        for (const parkingSpaceContract of contact.data.parkingSpaceContracts) {
          //
          const parkingSpaceEstateCode =
            await getEstateCodeFromXpandByRentalObjectCode(
              parkingSpaceContract.rentalPropertyId
            )

          if (parkingSpaceEstateCode != undefined) {
            if (listingEstateCode == parkingSpaceEstateCode) {
              subjectNeedsToReplaceContractToBeAbleToApply = true
              break
            }
          }
        }

        if (subjectNeedsToReplaceContractToBeAbleToApply) {
          //subject have an active parking space contract in the same property as the listing
          //only option is to replace that parking space contract
          ctx.body = {
            reason:
              'User already have an active parking space contract in the listings residential area',
          }
          ctx.status = 409
          return
        }

        //user has parking space contracts but none in the same property as the listing
        ctx.status = 403
        ctx.body = {
          reason:
            'User does not have any active parking space contracts in the listings residential area',
        }
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          logger.error(
            { err: error },
            'error when validating residential rules'
          )
          ctx.body = {
            error: error.message,
          }
        }
      }
    }
  )

  router.get(
    '(.*)/applicants/validateResidentialAreaRentalRules/:contactCode/:districtCode',
    async (ctx) => {
      try {
        const { contactCode, districtCode } = ctx.params

        if (!isListingInAreaWithSpecificRentalRules(districtCode)) {
          ctx.status = 200
          ctx.body = {
            reason: 'No residential area rental rules applies to this listing',
          }
          return
        }

        const contact = await getTenant({ contactCode })

        if (!contact.ok) {
          ctx.status = 500
          return
        }

        if (
          !isHousingContractsOfApplicantInSameAreaAsListing(
            districtCode,
            contact.data
          )
        ) {
          ctx.status = 403
          ctx.body = {
            reason:
              'Subject does not have any current or upcoming housing contracts in the residential area',
          }
          return
        }

        const doesUserHaveExistingParkingSpaceInSameAreaAsListing =
          doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
            districtCode,
            contact.data
          )

        if (!doesUserHaveExistingParkingSpaceInSameAreaAsListing) {
          //applicant is eligible for parking space, applicationType for application should be 'additonal'
          ctx.status = 200
          ctx.body = {
            reason:
              'Subject does not have any active parking space contracts in the listings residential area. Subject is eligible to apply to parking space.',
          }
          return
        }

        //applicant have an active parking space contract in the same area as the listing
        //only option is to replace that parking space contract
        ctx.body = {
          reason:
            'Subject already have an active parking space contract in the listings residential area',
        }
        ctx.status = 409
      } catch (err: unknown) {
        logger.error(err, 'Error when validating residential rental rules')

        ctx.status = 500
        if (err instanceof Error) {
          ctx.body = {
            error: err.message,
          }
        }
      }
    }
  )
}
