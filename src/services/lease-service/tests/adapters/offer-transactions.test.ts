import { db, migrate, teardown } from '../../adapters/db'
import * as offerTransactions from '../../adapters/offer-transactions'
import * as factory from './../factories'
import * as listingAdapter from '../../adapters/listing-adapter'
import * as offerAdapter from '../../adapters/offer-adapter'
import { ListingStatus, OfferStatus } from 'onecore-types'
import assert from 'node:assert'
import app from '../../../../app'
import { closeOfferByAccept } from '../../adapters/offer-transactions'
import resetAllMocks = jest.resetAllMocks

beforeAll(async () => {
  await migrate()
})

beforeEach(async () => {
  await resetAllMocks()
})

afterEach(async () => {
  await db('offer').del()
  await db('applicant').del()
  await db('listing').del()
})

afterAll(async () => {
  await teardown()
})

const updateListingStatusSpy = jest.spyOn(
  listingAdapter,
  'updateListingStatuses'
)

const updateApplicantStatusSpy = jest.spyOn(
  listingAdapter,
  'updateApplicantStatus'
)

describe('offerTransactions', () => {
  describe('closeOfferByAccept', () => {
    it('should throw error on initial failure', async () => {
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

      const res = await closeOfferByAccept(
        listing.data.id,
        offer.id,
        applicant.id
      )

      expect(updateListingStatusSpy).toHaveBeenCalled()
      expect(res).toBe('update-listing-status-failed')
    })

    it('should rollback if an insert fails', async () => {
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

      const res = await closeOfferByAccept(
        listing.data.id,
        offer.id,
        applicant.id
      )

      expect(updateApplicantStatusSpy).toHaveBeenCalled()
      expect(res).toBe('update-applicant-unknown')
      const listingFromDB = await listingAdapter.getListingById(listing.data.id)
      expect(listing.data.status).toBe(listingFromDB?.status)
    })
  })
})
