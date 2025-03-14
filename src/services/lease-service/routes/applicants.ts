import KoaRouter from '@koa/router'
import { z } from 'zod'
import { ApplicantStatus } from 'onecore-types'
import { logger, generateRouteMetadata } from 'onecore-utilities'

import {
  getApplicantByContactCodeAndListingId,
  getApplicantById,
  getApplicantsByContactCode,
  updateApplicantStatus,
} from '../adapters/listing-adapter'
import { getEstateCodeFromXpandByRentalObjectCode } from '../adapters/xpand/estate-code-adapter'
import * as propertyRentalRulesValidator from '../property-rental-rules-validator'
import { getTenant } from '../get-tenant'
import {
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  isHousingContractsOfApplicantInSameAreaAsListing,
  isListingInAreaWithSpecificRentalRules,
} from '../residential-area-rental-rules-validator'
import { parseRequestBody } from '../../../middlewares/parse-request-body'
import { db } from '../adapters/db'

/**
 * @swagger
 * tags:
 *   - name: Applicants
 *     description: Endpoints related to applicant operations
 */
export const routes = (router: KoaRouter) => {
  /**
   * @swagger
   * /applicants/{contactCode}/:
   *   get:
   *     summary: Get applicant based on contact code
   *     description: Fetches a list of applicants associated with a given contact code.
   *     tags: [Applicants]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the applicants to retrieve.
   *     responses:
   *       200:
   *         description: A list of applicants associated with the contact code.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       404:
   *         description: No applicant found for the provided contact code.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Applicant not found for the provided contactCode.
   *       500:
   *         description: An error occurred while fetching the applicant.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: An error occurred while fetching the applicant.
   */
  router.get('/applicants/:contactCode/', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const { contactCode } = ctx.params // Extracting from URL parameters
    try {
      const applicants = await getApplicantsByContactCode(contactCode)
      if (!applicants) {
        ctx.status = 404 // Not Found
        ctx.body = {
          reason: 'Applicant not found for the provided contactCode.',
          ...metadata,
        }
      } else {
        ctx.status = 200 // OK
        ctx.body = { content: applicants, ...metadata }
      }
    } catch (error) {
      logger.error(error, 'Error fetching applicant by contactCode:')
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while fetching the applicant.',
        ...metadata,
      }
    }
  })

  /**
   * @swagger
   * /applicants/{contactCode}/{listingId}:
   *   get:
   *     summary: Get applicant by contact code and listing id
   *     description: Fetch an applicant by contact code and listing ID.
   *     tags: [Applicants]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the applicant to retrieve.
   *       - in: path
   *         name: listingId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The listing ID associated with the applicant.
   *     responses:
   *       200:
   *         description: An applicant associated with the contact code and listing ID.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   description: The unique ID of the applicant.
   *                 name:
   *                   type: string
   *                   description: The name of the applicant.
   *                 email:
   *                   type: string
   *                   description: The email address of the applicant.
   *                 listingId:
   *                   type: integer
   *                   description: The listing ID associated with the applicant.
   *       404:
   *         description: No applicant found for the provided contact code and listing ID.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Applicant not found for the provided contactCode and listingId.
   *       500:
   *         description: An error occurred while fetching the applicant.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: An error occurred while fetching the applicant.
   */
  router.get('/applicants/:contactCode/:listingId', async (ctx) => {
    const metadata = generateRouteMetadata(ctx)
    const { contactCode, listingId } = ctx.params // Extracting from URL parameters
    try {
      const applicant = await getApplicantByContactCodeAndListingId(
        contactCode,
        parseInt(listingId)
      )

      if (!applicant) {
        ctx.status = 404 // Not Found
        ctx.body = {
          reason:
            'Applicant not found for the provided contactCode and listingId.',
          ...metadata,
        }
      } else {
        ctx.status = 200 // OK
        ctx.body = { content: applicant, ...metadata }
      }
    } catch (error) {
      logger.error(
        error,
        'Error fetching applicant by contactCode and rentalObjectCode:'
      )
      ctx.status = 500 // Internal Server Error
      ctx.body = {
        error: 'An error occurred while fetching the applicant.',
        ...metadata,
      }
    }
  })

  const updateApplicantStatusParams = z.object({
    status: z.nativeEnum(ApplicantStatus),
    contactCode: z.string().optional(),
    applicationType: z
      .union([z.literal('Replace'), z.literal('Additional')])
      .optional(),
  })

  /**
   * @swagger
   * /applicants/{id}/status:
   *   patch:
   *     summary: Update applicant status
   *     description: Update the status of an applicant.
   *     tags: [Applicants]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [Pending, Approved, Rejected, WithdrawnByUser, WithdrawnByAdmin]
   *                 description: The new status of the applicant.
   *               contactCode:
   *                 type: string
   *                 description: The contact code of the applicant. Required if status is WithdrawnByUser.
   *               applicationType:
   *                 required: false
   *                 type: string
   *                 description: Type of application. 'Replace' | 'Additional'.
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *         description: The unique ID of the applicant.
   *     responses:
   *       200:
   *         description: Applicant status updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Applicant status updated successfully.
   *       404:
   *         description: Applicant not found or mismatch in contact code for status WithdrawnByUser.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   examples:
   *                     applicantNotFound:
   *                       value: Applicant not found.
   *                     contactCodeMismatch:
   *                       value: Applicant not found for this contactCode.
   *       500:
   *         description: An error occurred while updating the applicant status.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: An error occurred while updating the applicant status.
   */
  router.patch(
    '/applicants/:id/status',
    parseRequestBody(updateApplicantStatusParams),
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      const { id } = ctx.params
      const { status, contactCode, applicationType } = ctx.request.body

      try {
        //if the applicant is withdrawn by the user, make sure the application belongs to that particular user
        if (status === ApplicantStatus.WithdrawnByUser) {
          const applicant = await getApplicantById(Number(id))
          if (applicant?.contactCode !== contactCode) {
            ctx.status = 404
            ctx.body = {
              reason: 'Applicant not found for this contactCode',
              ...metadata,
            }
            return
          }
        }

        const applicantUpdated = await updateApplicantStatus(db, {
          applicantId: Number(id),
          status,
          applicationType,
        })

        if (!applicantUpdated.ok) {
          if (applicantUpdated.err === 'no-update') {
            ctx.status = 404
            ctx.body = { reason: 'Applicant not found', ...metadata }
            return
          } else {
            ctx.status = 500
            ctx.body = { ...metadata, error: 'Error updating applicant' }
            return
          }
        }
        ctx.status = 200
        ctx.body = {
          message: 'Applicant status updated successfully',
          ...metadata,
        }
      } catch (error) {
        logger.error(error, 'Error updating applicant status')
        ctx.status = 500 // Internal Server Error
        ctx.body = {
          error: 'An error occurred while updating the applicant status.',
          ...metadata,
        }
      }
    }
  )

  /**
   * @swagger
   * /applicants/validatePropertyRentalRules/{contactCode}/{rentalObjectCode}:
   *   get:
   *     summary: Validate property rental rules for applicant
   *     description: Validate property rental rules for an applicant based on contact code and listing ID.
   *     tags: [Applicants]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the applicant.
   *       - in: path
   *         name: rentalObjectCode
   *         required: true
   *         schema:
   *           type: integer
   *         description: The xpand rental object code of the property.
   *     responses:
   *       200:
   *         description: No property rental rules apply to this property.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 applicationType: string
   *                 example: Additional - applicant is eligible for applying for an additional parking space. Replace - applicant is eligible for replacing their current parking space in the same residential area or property.
   *                 reason:
   *                   type: string
   *                   example: No property rental rules applies to this property.
   *       400:
   *         description: Rental object code is not a parking space.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reason:
   *                   type: string
   *                   example: Rental object code entity is not a parking space.
   *       403:
   *         description: Applicant is not eligible for the property based on property rental rules.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reason:
   *                   type: string
   *                   examples:
   *                     notTenant:
   *                       value: Applicant is not a current or coming tenant in the property.
   *                     noParkingContracts:
   *                       value: User does not have any active parking space contracts in the property residential area.
   *       404:
   *         description: Listing, property info, or applicant not found.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reason:
   *                   type: string
   *                   examples:
   *                     listingNotFound:
   *                       value: Listing was not found.
   *                     propertyInfoNotFound:
   *                       value: Property info for listing was not found.
   *                     applicantNotFound:
   *                       value: Applicant was not found.
   *                     contactCodeMismatch:
   *                       value: Applicant not found for this contactCode.
   *       500:
   *         description: An error occurred while validating property rental rules.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: An error occurred while validating property rental rules.
   */
  router.get(
    '(.*)/applicants/validatePropertyRentalRules/:contactCode/:rentalObjectCode',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      try {
        const { contactCode, rentalObjectCode } = ctx.params

        const propertyInfo =
          await getEstateCodeFromXpandByRentalObjectCode(rentalObjectCode)

        if (!propertyInfo) {
          ctx.status = 404
          ctx.body = {
            reason: 'Listing was not found',
            ...metadata,
          }
          return
        }

        if (propertyInfo.type !== 'babps') {
          ctx.status = 400
          ctx.body = {
            reason: 'Rental object code entity is not a parking space',
            ...metadata,
          }
        }

        if (
          !propertyRentalRulesValidator.parkingSpaceNeedsValidation(
            propertyInfo.estateCode
          )
        ) {
          ctx.status = 200
          ctx.body = {
            applicationType: 'Additional',
            message: 'No property rental rules applies to this parking space',
            ...metadata,
          }
          return
        }

        const contact = await getTenant({ contactCode })

        if (!contact.ok) {
          ctx.status = 500
          ctx.body = {
            error: 'Internal Error',
            ...metadata,
          }
          return
        }

        const validatableLease =
          contact.data.currentHousingContract ||
          contact.data.upcomingHousingContract

        if (!validatableLease) {
          ctx.status = 403
          ctx.body = {
            reason: 'User is not a current or coming tenant in the property',
            ...metadata,
          }
          return
        }

        const isRentableForTenant =
          await propertyRentalRulesValidator.isParkingSpaceRentableForTenant(
            validatableLease,
            propertyInfo.estateCode
          )

        if (!isRentableForTenant) {
          ctx.status = 403
          ctx.body = {
            reason: 'User is not a current or coming tenant in the property',
            ...metadata,
          }
          return
        }

        //if subject has no parking space contracts but is a tenant in the property
        if (!contact.data.parkingSpaceContracts?.length) {
          //subject is eligible for parking space, applicationType for application should be 'additonal'
          ctx.status = 200
          ctx.body = {
            applicationType: 'Additional',
            message:
              'User is a tenant in the property and does not have any active parking space contracts in the listings residential area. User is eligible to apply with applicationType additional.',
            ...metadata,
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
            message:
              'User already have an active parking space contract in the listings residential area. User is eligible to apply with applicationType Replace.',
            ...metadata,
          }
          return
        }

        //user has parking space contracts but none in the same property as the listing
        ctx.status = 200
        ctx.body = {
          applicationType: 'Additional',
          message:
            'User is a tenant in the property and does not have any active parking space contracts in the listings residential area. User is eligible to apply with applicationType additional.',
          ...metadata,
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
            ...metadata,
          }
        }
      }
    }
  )

  /**
   * @swagger
   * /applicants/validateResidentialAreaRentalRules/{contactCode}/{districtCode}:
   *   get:
   *     summary: Validate residential area rental rules for applicant
   *     description: Validate residential area rental rules for an applicant based on contact code and district code.
   *     tags: [Applicants]
   *     parameters:
   *       - in: path
   *         name: contactCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The contact code of the applicant.
   *       - in: path
   *         name: districtCode
   *         required: true
   *         schema:
   *           type: string
   *         description: The xpand district code of the residential area to validate against.
   *     responses:
   *       200:
   *         description: Either no residential area rental rules apply or applicant is eligible to apply for parking space.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 applicationType: string
   *                 example: Additional - applicant is eligible for applying for an additional parking space. Replace - applicant is eligible for replacing their current parking space in the same residential area or property.
   *                 reason:
   *                   type: string
   *                   examples:
   *                     noRules:
   *                       value: No residential area rental rules applies to this listing.
   *                     eligible:
   *                       value: Applicant does not have any active parking space contracts in the listings residential area. Applicant is eligible to apply to parking space.
   *       403:
   *         description: Applicant is not eligible for the listing based on residential area rental rules.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reason:
   *                   type: string
   *                   example: Applicant does not have any current or upcoming housing contracts in the residential area.
   *       404:
   *         description: Listing or applicant not found.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 reason:
   *                   type: string
   *                   examples:
   *                     listingNotFound:
   *                       value: Listing was not found.
   *                     applicantNotFound:
   *                       value: Applicant was not found.
   *       500:
   *         description: An error occurred while validating residential area rental rules.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: An error occurred while validating residential area rental rules.
   */
  router.get(
    '(.*)/applicants/validateResidentialAreaRentalRules/:contactCode/:districtCode',
    async (ctx) => {
      const metadata = generateRouteMetadata(ctx)
      try {
        const { contactCode, districtCode } = ctx.params

        if (!isListingInAreaWithSpecificRentalRules(districtCode)) {
          ctx.status = 200
          ctx.body = {
            applicationType: 'Additional',
            message:
              'No residential area rental rules applies to this parking space',
            ...metadata,
          }
          return
        }

        const contact = await getTenant({ contactCode })

        if (!contact.ok) {
          ctx.status = 500
          ctx.body = { error: 'Internal Error', ...metadata }
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
            ...metadata,
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
            message:
              'Subject does not have any active parking space contracts in the listings residential area. Subject is eligible to apply to parking space with applicationType additional.',
            ...metadata,
          }
          return
        }

        //applicant have an active parking space contract in the same area as the listing
        //only option is to replace that parking space contract
        ctx.status = 200
        ctx.body = {
          applicationType: 'Replace',
          message:
            'Subject already have an active parking space contract in the listings residential area. Subject is eligible to apply to parking space with applicationType replace.',
          ...metadata,
        }
      } catch (err: unknown) {
        logger.error(err, 'Error when validating residential rental rules')

        ctx.status = 500
        if (err instanceof Error) {
          ctx.body = {
            error: err.message,
            ...metadata,
          }
        }
      }
    }
  )
}
