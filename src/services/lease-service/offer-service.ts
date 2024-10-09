import { Knex } from 'knex'
import { ApplicantStatus, ListingStatus, OfferStatus } from 'onecore-types'

import { db } from './adapters/db'
import * as listingAdapter from './adapters/listing-adapter'
import * as offerAdapter from './adapters/offer-adapter'
import { AdapterResult } from './adapters/types'

export const acceptOffer = async (params: {
  applicantId: number
  listingId: number
  offerId: number
}): Promise<
  AdapterResult<
    null,
    'update-listing' | 'update-applicant' | 'update-offer' | 'unknown'
  >
> => {
  try {
    await db.transaction(async (trx) => {
      await updateListing(params.listingId, trx)
      await updateApplicant(
        params.applicantId,
        ApplicantStatus.OfferAccepted,
        trx
      )
      await updateOfferAnsweredStatus(
        params.offerId,
        OfferStatus.Accepted,
        new Date(),
        trx
      )
    })

    return { ok: true, data: null }
  } catch (err) {
    if (err === 'update-listing') {
      return { ok: false, err }
    }

    if (err === 'update-applicant') {
      return { ok: false, err }
    }

    if (err === 'update-offer') {
      return { ok: false, err }
    }

    return { ok: false, err: 'unknown' }
  }
}

export const denyOffer = async (params: {
  applicantId: number
  offerId: number
}): Promise<
  AdapterResult<null, 'update-applicant' | 'update-offer' | 'unknown'>
> => {
  try {
    await db.transaction(async (trx) => {
      await updateApplicant(
        params.applicantId,
        ApplicantStatus.WithdrawnByUser,
        trx
      )
      await updateOfferAnsweredStatus(
        params.offerId,
        OfferStatus.Declined,
        new Date(),
        trx
      )
    })

    return { ok: true, data: null }
  } catch (err) {
    if (err === 'update-applicant') {
      return { ok: false, err }
    }

    if (err === 'update-offer') {
      return { ok: false, err }
    }

    return { ok: false, err: 'unknown' }
  }
}

const updateListing = async (listingId: number, trx: Knex) => {
  const updateListing = await listingAdapter.updateListingStatuses(
    [listingId],
    ListingStatus.Assigned,
    trx
  )

  if (!updateListing.ok) {
    throw 'update-listing'
  }
}

const updateApplicant = async (
  applicantId: number,
  applicantStatus: ApplicantStatus,
  trx: Knex
) => {
  const updateApplicant = await listingAdapter.updateApplicantStatus(
    applicantId,
    applicantStatus,
    trx
  )

  if (!updateApplicant.ok) {
    throw 'update-applicant'
  }
}

const updateOfferAnsweredStatus = async (
  offerId: number,
  offerStatus: OfferStatus,
  answeredAt: Date,
  trx: Knex
) => {
  const updateOffer = await offerAdapter.updateOfferAnsweredStatus(
    {
      offerId,
      status: offerStatus,
      answeredAt: answeredAt,
    },
    trx
  )
  if (!updateOffer.ok) {
    throw 'update-offer'
  }
}
