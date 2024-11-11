import { OfferStatus } from 'onecore-types'
import assert from 'node:assert'
import { Knex } from 'knex'

import { db, migrate, teardown } from '../../adapters/db'
import * as offerAdapter from '../../adapters/offer-adapter'
import * as factory from './../factories'
import * as listingAdapter from '../../adapters/listing-adapter'
import { clearDb } from '../testUtils'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await clearDb(db)
})

afterAll(async () => {
  await teardown()
})

describe('offer-adapter', () => {
  describe(offerAdapter.create, () => {
    it('fails gracefully if applicant not found', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )

      assert(listing.ok)
      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.offerApplicant.build({
            id: -1,
          }),
        ],
        listingId: listing.data.id,
        applicantId: -1,
      })
      expect(offer.ok).toBe(false)
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
          factory.offerApplicant.build({
            listingId: listing.data.id,
            applicantId: applicant_one.id,
            priority: 2,
          }),
          factory.offerApplicant.build({
            listingId: listing.data.id,
            applicantId: applicant_two.id,
            priority: 2,
            sortOrder: 2,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant_one.id,
      })

      assert(insertedOffer.ok)
      const [offerFromDb] = await db.raw(
        `SELECT * from offer WHERE id = ${insertedOffer.data.id}`
      )

      expect(offerFromDb.ListingId).toEqual(listing.data.id)
      expect(offerFromDb.ApplicantId).toEqual(applicant_one.id)
    })

    it('inserts offer applicants', async () => {
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

      const offerApplicant = factory.offerApplicant.build({
        listingId: listing.data.id,
        applicantId: applicant_one.id,
        priority: 2,
        sortOrder: 1,
      })

      const offerApplicantWithPriorityNull = factory.offerApplicant.build({
        listingId: listing.data.id,
        applicantId: applicant_two.id,
        priority: null,
        sortOrder: 1,
      })

      const insertedOffer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [offerApplicant, offerApplicantWithPriorityNull],
        listingId: listing.data.id,
        applicantId: applicant_one.id,
      })

      assert(insertedOffer.ok)
      const selectedApplicantsFromDb = await db.raw(
        'SELECT * FROM offer_applicant ORDER BY sortOrder ASC'
      )

      expect(selectedApplicantsFromDb).toHaveLength(2)
      expect(selectedApplicantsFromDb).toEqual([
        {
          id: expect.any(Number),
          listingId: listing.data.id,
          offerId: insertedOffer.data.id,
          applicantId: applicant_one.id,
          applicantStatus: offerApplicant.status,
          applicantApplicationType: offerApplicant.applicationType,
          applicantQueuePoints: offerApplicant.queuePoints,
          applicantAddress: offerApplicant.address,
          applicantHasParkingSpace: true,
          applicantHousingLeaseStatus: offerApplicant.housingLeaseStatus,
          applicantPriority: offerApplicant.priority,
          createdAt: expect.any(Date),
          sortOrder: 1,
        },
        {
          id: expect.any(Number),
          listingId: listing.data.id,
          offerId: insertedOffer.data.id,
          applicantId: applicant_two.id,
          applicantStatus: offerApplicantWithPriorityNull.status,
          applicantApplicationType:
            offerApplicantWithPriorityNull.applicationType,
          applicantQueuePoints: offerApplicantWithPriorityNull.queuePoints,
          applicantAddress: offerApplicantWithPriorityNull.address,
          applicantHasParkingSpace: true,
          applicantHousingLeaseStatus:
            offerApplicantWithPriorityNull.housingLeaseStatus,
          applicantPriority: offerApplicantWithPriorityNull.priority,
          createdAt: expect.any(Date),
          sortOrder: 2,
        },
      ])
    })
  })

  describe(offerAdapter.getOffersForContact, () => {
    it('gets the offers for a contact', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const insertOffer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.offerApplicant.build({
            applicantId: applicant.id,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      assert(insertOffer.ok)

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

      const insertOffer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.offerApplicant.build({
            applicantId: applicant.id,
          }),
        ],
        listingId: listing.data.id,
        applicantId: applicant.id,
      })

      assert(insertOffer.ok)

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
          factory.offerApplicant.build({
            applicantId: applicant.id,
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
          factory.offerApplicant.build({
            applicantId: applicant.id,
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

      assert(listingRes.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listingRes.data.id })
      )

      const offer = await offerAdapter.create(db, {
        expiresAt: new Date(),
        status: OfferStatus.Active,
        selectedApplicants: [
          factory.offerApplicant.build({
            applicantId: applicant.id,
            contactCode: applicant.contactCode,
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

  describe(offerAdapter.getOffersWithOfferApplicantsByListingId, () => {
    it('fails correctly', async () => {
      const res = await offerAdapter.getOffersWithOfferApplicantsByListingId(
        {
          raw: jest.fn().mockRejectedValueOnce('boom'),
        } as unknown as Knex,
        1
      )
      expect(res).toEqual({ ok: false, err: 'unknown' })
    })

    it('gets offers by listing id', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)

      const applicants = [
        factory.applicant.build({ listingId: listing.data.id, name: 'A' }),
        factory.applicant.build({ listingId: listing.data.id, name: 'B' }),
      ]

      const insertedApplicants = await Promise.all(
        applicants.map(listingAdapter.createApplication)
      )

      const insertedOffer_1 = await offerAdapter.create(db, {
        status: OfferStatus.Active,
        expiresAt: new Date(),
        listingId: listing.data.id,
        applicantId: insertedApplicants[0].id,
        selectedApplicants: [
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

      const insertedOffer_2 = await offerAdapter.create(db, {
        status: OfferStatus.Expired,
        expiresAt: new Date(),
        listingId: listing.data.id,
        applicantId: insertedApplicants[1].id,
        selectedApplicants: [
          factory.offerApplicant.build({
            listingId: listing.data.id,
            applicantId: insertedApplicants[1].id,
          }),
        ],
      })

      assert(insertedOffer_1.ok)
      assert(insertedOffer_2.ok)

      const res = await offerAdapter.getOffersWithOfferApplicantsByListingId(
        db,
        listing.data.id
      )
      assert(res.ok)
      expect(res.data).toEqual([
        expect.objectContaining({
          id: insertedOffer_1.data.id,
          sentAt: null,
          expiresAt: expect.any(Date),
          answeredAt: null,
          status: OfferStatus.Active,
          listingId: listing.data.id,
          createdAt: expect.any(Date),
          offeredApplicant: expect.objectContaining({
            id: insertedApplicants[0].id,
            name: insertedApplicants[0].name,
            contactCode: insertedApplicants[0].contactCode,
            applicationDate: expect.any(Date),
            applicationType: insertedApplicants[0].applicationType,
            status: insertedApplicants[0].status,
            listingId: listing.data.id,
            nationalRegistrationNumber:
              insertedApplicants[0].nationalRegistrationNumber,
          }),
          selectedApplicants: [
            expect.objectContaining({
              applicantId: insertedApplicants[0].id,
              applicationDate: expect.any(Date),
              name: insertedApplicants[0].name,
            }),
            expect.objectContaining({
              applicantId: insertedApplicants[1].id,
              applicationDate: expect.any(Date),
              name: insertedApplicants[1].name,
            }),
          ],
        }),
        expect.objectContaining({
          id: insertedOffer_2.data.id,
          status: OfferStatus.Expired,
          listingId: listing.data.id,
          offeredApplicant: expect.objectContaining({
            id: insertedApplicants[1].id,
          }),
          selectedApplicants: [
            expect.objectContaining({
              applicantId: insertedApplicants[1].id,
              applicationDate: expect.any(Date),
              name: insertedApplicants[1].name,
            }),
          ],
        }),
      ])
    })
  })

  describe(offerAdapter.updateOfferSentAt, () => {
    it('returns err if there was no update', async () => {
      const res = await offerAdapter.updateOfferSentAt(db, 1, new Date())
      expect(res).toEqual({ ok: false, err: 'no-update' })
    })

    it('updates sent at', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      assert(listing.ok)
      const applicant = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.data.id })
      )

      const offer = await offerAdapter.create(db, {
        selectedApplicants: factory.offerApplicant.buildList(1, {
          applicantId: applicant.id,
        }),
        applicantId: applicant.id,
        expiresAt: new Date(),
        listingId: listing.data.id,
        status: OfferStatus.Active,
      })

      assert(offer.ok)

      const res = await offerAdapter.updateOfferSentAt(
        db,
        offer.data.id,
        new Date()
      )
      expect(res).toEqual({ ok: true, data: null })
      const updatedOffer = await offerAdapter.getOfferByOfferId(offer.data.id)
      assert(updatedOffer.ok)
      expect(updatedOffer.data.sentAt).not.toBeNull()
    })
  })
})
