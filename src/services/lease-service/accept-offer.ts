import { ApplicantStatus, ListingStatus, OfferStatus } from 'onecore-types'

import { db } from './adapters/db'
import * as listingAdapter from './adapters/listing-adapter'
import * as offerAdapter from './adapters/offer-adapter'

export const acceptOffer = (params: {
  applicantId: number
  listingId: number
  offerId: number
}) => {
  return db.transaction(async (trx) => {
    try {
      const updateListing = await listingAdapter.updateListingStatuses(
        [params.listingId],
        ListingStatus.Assigned,
        trx
      )

      if (updateListing === 0) {
        return 'update-listing-failed'
      }

      try {
        const updateApplicant = await listingAdapter.updateApplicantStatus(
          params.applicantId,
          ApplicantStatus.OfferAccepted,
          trx
        )

        console.log('HELLO')
        if (!updateApplicant) {
          return 'update-applicant-failed'
        }

        const updateOffer = await offerAdapter.updateOfferStatus(
          OfferStatus.Accepted,
          params.offerId,
          trx
        )

        if (!updateOffer.ok) {
          return 'update-offer-failed'
        }
        return 'update-offer-success'
      } catch (err) {
        return 'update-applicant-failed'
      }
    } catch (err) {
      return 'update-listing-failed'
    }
  })
}
