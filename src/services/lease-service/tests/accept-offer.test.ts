import { ListingStatus, OfferStatus } from 'onecore-types'
import assert from 'node:assert'

import * as factory from './factories'
import * as listingAdapter from '../adapters/listing-adapter'
import * as offerAdapter from '../adapters/offer-adapter'
import { db, migrate, teardown } from '../adapters/db'
import * as service from '../accept-offer'

beforeAll(migrate)

afterEach(async () => {
  await db('offer').del()
  await db('applicant').del()
  await db('listing').del()
})

afterAll(teardown)

const updateListingStatusSpy = jest.spyOn(
  listingAdapter,
  'updateListingStatuses'
)

const updateApplicantStatusSpy = jest.spyOn(
  listingAdapter,
  'updateApplicantStatus'
)

const updateOfferSpy = jest.spyOn(offerAdapter, 'updateOfferStatus')

afterEach(jest.restoreAllMocks)

describe('acceptOffer', () => {
  it('returns gracefully if listing update fails', async () => {
    const listing = await listingAdapter.createListing(
      factory.listing.build({ status: ListingStatus.Expired })
    )
    assert(listing.ok)
    const applicant = await listingAdapter.createApplication(
      factory.applicant.build({ listingId: listing.data.id })
    )

    const offer = await offerAdapter.create({
      status: OfferStatus.Active,
      listingId: listing.data.id,
      applicantId: applicant.id,
      selectedApplicants: [],
      expiresAt: new Date(),
    })

    updateListingStatusSpy.mockRejectedValueOnce({ err: 'error' })
    const res = await service.acceptOffer({
      applicantId: applicant.id,
      listingId: listing.data.id,
      offerId: offer.id,
    })

    expect(updateListingStatusSpy).toHaveBeenCalled()
    expect(res).toBe('update-listing-failed')
  })

  it.only('rollbacks listing status change if update applicant fails', async () => {
    const listing = await listingAdapter.createListing(
      factory.listing.build({ status: ListingStatus.Expired })
    )
    assert(listing.ok)
    const applicant = await listingAdapter.createApplication(
      factory.applicant.build({ listingId: listing.data.id })
    )

    const offer = await offerAdapter.create({
      status: OfferStatus.Active,
      listingId: listing.data.id,
      applicantId: applicant.id,
      selectedApplicants: [],
      expiresAt: new Date(),
    })

    updateApplicantStatusSpy.mockRejectedValueOnce({ err: 'error' })
    const res = await service.acceptOffer({
      applicantId: applicant.id,
      listingId: listing.data.id,
      offerId: offer.id,
    })

    expect(updateApplicantStatusSpy).toHaveBeenCalled()
    expect(res).toBe('update-applicant-failed')

    const listingFromDB = await listingAdapter.getListingById(listing.data.id)
    console.log(listingFromDB)
    expect(listingFromDB?.status).toBe(listing.data.status)
  })

  it('rollbacks listing status change and applicant status change if update offer fails', async () => {
    const listing = await listingAdapter.createListing(
      factory.listing.build({ status: ListingStatus.Expired })
    )
    assert(listing.ok)
    const applicant = await listingAdapter.createApplication(
      factory.applicant.build({ listingId: listing.data.id })
    )

    const offer = await offerAdapter.create({
      status: OfferStatus.Active,
      listingId: listing.data.id,
      applicantId: applicant.id,
      selectedApplicants: [],
      expiresAt: new Date(),
    })

    updateOfferSpy.mockRejectedValueOnce('foo')
    const res = await service.acceptOffer({
      applicantId: applicant.id,
      listingId: listing.data.id,
      offerId: offer.id,
    })

    console.log(res)
    expect(updateApplicantStatusSpy).toHaveBeenCalled()
    expect(res).toBe('update-applicant-failed')

    const listingFromDB = await listingAdapter.getListingById(listing.data.id)
    expect(listing.data.status).toBe(listingFromDB?.status)
  })
})
