import KoaRouter from '@koa/router'
import { z } from 'zod'
import { ApplicantStatus } from 'onecore-types'
import { logger } from 'onecore-utilities'

import {
  getApplicantByContactCodeAndListingId,
  getApplicantById,
  getApplicantsByContactCode,
  updateApplicantStatus,
} from '../adapters/listing-adapter'
import { getEstateCodeFromXpandByRentalObjectCode } from '../adapters/xpand/estate-code-adapter'
import {
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  doesTenantHaveHousingContractInSamePropertyAsListing,
} from '../property-rental-rules-validator'
import { getTenant } from '../get-tenant'
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
    contactCode: z.string().optional(),
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
          if (applicant?.contactCode !== contactCode) {
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
    '(.*)/applicants/validatePropertyRentalRules/:contactCode/:rentalObjectCode',
    async (ctx) => {
      try {
        const { contactCode, rentalObjectCode } = ctx.params

        const propertyInfo =
          await getEstateCodeFromXpandByRentalObjectCode(rentalObjectCode)

        if (!propertyInfo) {
          ctx.status = 404
          return
        }

        if (propertyInfo.type !== 'babps') {
          ctx.status = 400
          ctx.body = {
            reason: 'Rental object code entity is not a parking space',
          }
        }

        if (
          !doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(
            propertyInfo.estateCode
          )
        ) {
          ctx.status = 200
          ctx.body = {
            applicationType: 'Additional',
            reason: 'No property rental rules applies to this parking space',
          }
          return
        }

        const contact = await getTenant({ contactCode })

        if (!contact.ok) {
          ctx.status = 500
          ctx.body = 'Internal Error'
          return
        }

        const subjectHasHousingContractInSamePropertyAsListing =
          await doesTenantHaveHousingContractInSamePropertyAsListing(
            contact.data,
            propertyInfo.estateCode
          )

        if (!subjectHasHousingContractInSamePropertyAsListing) {
          ctx.status = 403
          ctx.body = {
            reason: 'User is not a current or coming tenant in the property',
          }
          return
        }

        //if subject has no parking space contracts but is a tenant in the property
        if (!contact.data.parkingSpaceContracts?.length) {
          //subject is eligible for parking space, applicationType for application should be 'additonal'
          ctx.status = 200
          ctx.body = {
            applicationType: 'Additional',
            reason:
              'User is a tenant in the property and does not have any active parking space contracts in the listings residential area. User is eligible to apply with applicationType additional.',
          }
          return
        }

        const getParkingSpacePropertyInfo =
          contact.data.parkingSpaceContracts.map((lease) =>
            getEstateCodeFromXpandByRentalObjectCode(lease.rentalPropertyId)
          )

        const parkingSpaceEstateCodes = await Promise.all(
          getParkingSpacePropertyInfo
        ).then((res) => res.filter(Boolean).map((r) => r?.estateCode))

        const subjectNeedsToReplaceParkingSpace = parkingSpaceEstateCodes.some(
          (v) => v === propertyInfo.estateCode
        )

        if (subjectNeedsToReplaceParkingSpace) {
          ctx.status = 200
          ctx.body = {
            applicationType: 'Replace',
            reason:
              'User already have an active parking space contract in the listings residential area. User is eligible to apply with applicationType Replace.',
          }
          return
        }

        //user has parking space contracts but none in the same property as the listing
        ctx.status = 200
        ctx.body = {
          applicationType: 'Additional',
          reason:
            'User is a tenant in the property and does not have any active parking space contracts in the listings residential area. User is eligible to apply with applicationType additional.',
        }
      } catch (error: unknown) {
        ctx.status = 500

        if (error instanceof Error) {
          logger.error(
            { err: error },
            'Error when validating residential rules'
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
            applicationType: 'Additional',
            reason:
              'No residential area rental rules applies to this parking space',
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
            applicationType: 'Additional',
            reason:
              'Subject does not have any active parking space contracts in the listings residential area. Subject is eligible to apply to parking space with applicationType additional.',
          }
          return
        }

        //applicant have an active parking space contract in the same area as the listing
        //only option is to replace that parking space contract
        ctx.status = 200
        ctx.body = {
          applicationType: 'Replace',
          reason:
            'Subject already have an active parking space contract in the listings residential area. Subject is eligible to apply to parking space with applicationType replace.',
        }
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
