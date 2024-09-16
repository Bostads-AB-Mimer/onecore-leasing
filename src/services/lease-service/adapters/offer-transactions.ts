import { db } from './db'
import * as listingAdapter from './listing-adapter'
import {
  ApplicantStatus,
  DetailedOffer,
  ListingStatus,
  OfferStatus,
} from 'onecore-types'
import * as offerAdapter from './offer-adapter'

export const closeOfferByAccept = async (
  listingId: number,
  offerId: number,
  applicantId: number
) => {
  return await db.transaction(async (trx) => {
    try {
      const updateListing = await listingAdapter.updateListingStatuses(
        [listingId],
        ListingStatus.Assigned,
        trx
      )

      if (updateListing === 0) {
        return 'update-listing-status-failed'
      }

      try {
        console.log('updateApplicant')
        const updateApplicant = await listingAdapter.updateApplicantStatus(
          applicantId,
          ApplicantStatus.OfferAccepted,
          trx
        )
        console.log('updateApplicant', updateApplicant)
        if (!updateApplicant) {
          return 'update-applicant-status-failure'
        }

        const updateOffer = await offerAdapter.updateOfferStatus(
          OfferStatus.Accepted,
          offerId,
          trx
        )

        if (!updateOffer.ok) {
          return 'update-offer-failed'
        }
        // ctx.status = 200
        // ctx.body = {
        //   content: 'all good',
        //   ...metadata,
        // }
        return 'update-offer-success'
      } catch (err) {
        console.log('inner exception')
        // ctx.status = 500
        // ctx.body = {
        //   content: 'update-applicant-status',
        //   ...metadata,
        // }
        return 'update-applicant-unknown'
      }
    } catch (err) {
      // ctx.status = 500
      // ctx.body = {
      //   content: 'update-listing-status',
      //   ...metadata,
      // }
      return 'update-offer-unknown-error-outer'
    }
  })
}
