// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { OfferStatus } from 'onecore-types'
import assert from 'node:assert'

import { db, migrate, teardown } from '../../adapters/db'
import * as offerAdapter from '../../adapters/offer-adapter'
import * as factory from './../factories'
import * as listingAdapter from '../../adapters/listing-adapter'
import { Knex } from 'knex'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await db('offer_applicant').del()
  await db('offer').del()
  await db('applicant').del()
  await db('listing').del()
})

afterAll(async () => {
  await teardown()
})

describe('offer-adapter', () => {
  describe(offerAdapter.create, () => {
    it('fails if applicant does not exist', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)

      const insertedOffer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [],
        listingId: listing.data.id,
        applicantId: -1,
      })

      expect(insertedOffer).toEqual({ ok: false, err: 'no-applicant' })
    })

    it('inserts a new offer in the database', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant_one = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const applicant_two = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const insertedOffer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant_one.id,
            contactCode: applicant_one.contactCode,
            nationalRegistrationNumber:
              applicant_one.nationalRegistrationNumber,
            priority: 1,
          }),
          factory.detailedApplicant.build({
            id: applicant_two.id,
            contactCode: applicant_two.contactCode,
            nationalRegistrationNumber:
              applicant_one.nationalRegistrationNumber,
            priority: 1,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant_one.id,
      })

      assert(insertedOffer.ok)
      expect(insertedOffer.data.listingId).toEqual(insertedOffer.data.listingId)
      expect(insertedOffer.data.offeredApplicant.id).toEqual(applicant_one.id)
      const offerApplicants = await db('offer_applicant')
      expect(offerApplicants).toHaveLength(2)
    })

    it('throws error if applicant not found', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )

      assert(listing.ok)
      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: -1,
            contactCode: 'NON_EXISTING_APPLICANT',
            nationalRegistrationNumber: 'I_DO_NOT_EXIST',
          }),
        ],
        listingId: listing.data.id,
        applicantId: -1,
      })
      expect(offer.ok).toBe(false)
      // .rejects.toThrow('Applicant not found when creating offer')
    })
  })

  describe(offerAdapter.getOffersForContact, () => {
    it('gets the offers a a contact', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant.id,
            contactCode: applicant.contactCode,
            nationalRegistrationNumber: applicant.nationalRegistrationNumber,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      const offersFromDb = await offerAdapter.getOffersForContact(
        applicant.contactCode
      )
      expect(offersFromDb).toHaveLength(1)
      expect(offersFromDb[0].offeredApplicant.contactCode).toEqual(
        applicant.contactCode
      )
    })

    it('returns empty list if applicant has no offers', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant.id,
            contactCode: applicant.contactCode,
            nationalRegistrationNumber: applicant.nationalRegistrationNumber,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      const offersFromDb = await offerAdapter.getOffersForContact(
        'NON_EXISTING_CONTACT_CODE'
      )

      expect(offersFromDb).toEqual([])
    })
  })

  describe(offerAdapter.getOfferByContactCodeAndOfferId, () => {
    it('gets the offer a a contact', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant.id,
            contactCode: applicant.contactCode,
            nationalRegistrationNumber: applicant.nationalRegistrationNumber,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      assert(offer.ok)
      const offersFromDb = await offerAdapter.getOfferByContactCodeAndOfferId(
        applicant.contactCode,
        offer.data.id
      )
      expect(offersFromDb).toBeDefined()
      expect(offersFromDb?.id).toEqual(offer.data.id)
      expect(offersFromDb?.offeredApplicant.contactCode).toEqual(
        applicant.contactCode
      )
    })

    it('returns empty object if offer does not exist', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const offersFromDb = await offerAdapter.getOfferByContactCodeAndOfferId(
        applicant.contactCode,
        123456
      )
      expect(offersFromDb).toBeUndefined()
    })

    it('returns empty object if applicant does not exist', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant.id,
            contactCode: applicant.contactCode,
            nationalRegistrationNumber: applicant.nationalRegistrationNumber,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      assert(offer.ok)
      const offersFromDb = await offerAdapter.getOfferByContactCodeAndOfferId(
        'NON_EXISTING_CONTACT_CODE',
        offer.data.id
      )
      expect(offersFromDb).toBeUndefined()
    })
  })

  describe(offerAdapter.getOfferByOfferId, () => {
    it('gets an offer by id', async () => {
      const listingRes = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      if (!listingRes.ok) fail('Setup failed. Listing could not be completed')

      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listingRes.data.id })
      )

      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.detailedApplicant.build({
            id: applicant.id,
            contactCode: applicant.contactCode,
            nationalRegistrationNumber: applicant.nationalRegistrationNumber,
          }),
        ],
        listingId: listingRes.data.id,
        applicantId: applicant.id,
      })

      assert(offer.ok)
      const res = await offerAdapter.getOfferByOfferId(offer.data.id)

      expect(res.ok).toBeTruthy()
      if (res.ok) {
        expect(res.data.id).toEqual(offer.data.id)
        expect(res.data.offeredApplicant.contactCode).toEqual(
          applicant.contactCode
        )
      }
    })

    it('returns empty object if offer does not exist', async () => {
      const res = await offerAdapter.getOfferByOfferId(123456)
      expect(res.ok).toBeFalsy()
      if (!res.ok) expect(res.err).toBe('not-found')
    })
  })

  describe(offerAdapter.getOffersByListingId, () => {
    it('fails correctly', async () => {
      const res = await offerAdapter.getOffersByListingId(1, {
        select: jest.fn().mockRejectedValueOnce('boom'),
      } as unknown as Knex)

      expect(res).toEqual({ ok: false, err: 'unknown' })
    })

    it('gets offers by listing id', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)

      const applicants = factory.applicant.buildList(2, {
        listingId: listing.data.id,
      })

      const insertedApplicants = await Promise.all(
        applicants.map(listingAdapter.createApplication)
      )

      // TODO: Should be a db constraint on multiple active offers per listing
      await offerAdapter.create(db, {
        status: OfferStatus.Active,
        expiresAt: new Date(),
        listingId: listing.data.id,
        applicantId: insertedApplicants[0].id,
        offerApplicants: [
          factory.offerApplicant.build({
            listingId: listing.data.id,
            applicantId: insertedApplicants[0].id,
          }),
          factory.offerApplicant.build({
            listingId: listing.data.id,
            applicantId: insertedApplicants[1].id,
          }),
        ],
      })

      await offerAdapter.create(db, {
        status: OfferStatus.Expired,
        expiresAt: new Date(),
        listingId: listing.data.id,
        applicantId: insertedApplicants[1].id,
        selectedApplicants: [
          factory.detailedApplicant.build({ id: insertedApplicants[1].id }),
        ],
      })

      const res = await offerAdapter.getOffersByListingId(listing.data.id)
      assert(res.ok)

      expect(res.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: OfferStatus.Active,
            listingId: listing.data.id,
            offeredApplicant: expect.objectContaining({
              id: insertedApplicants[0].id,
            }),
            selectedApplicants: [
              expect.objectContaining({
                applicantId: insertedApplicants[0].id,
              }),
            ],
          }),
          expect.objectContaining({
            status: OfferStatus.Expired,
            listingId: listing.data.id,
            offeredApplicant: expect.objectContaining({
              id: insertedApplicants[1].id,
            }),
            selectedApplicants: [
              expect.objectContaining({
                applicantId: insertedApplicants[1].id,
              }),
            ],
          }),
        ])
      )
    })
  })
})
