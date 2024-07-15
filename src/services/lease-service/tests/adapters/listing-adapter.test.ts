import { db, migrate, teardown } from '../../adapters/db'

jest.mock('onecore-utilities', () => {
  return {
    logger: {
      info: () => {
        return
      },
      error: () => {
        return
      },
    },
  }
})

import * as listingAdapter from '../../adapters/listing-adapter'
import * as factory from './../factories'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await db('applicant').del()
  await db('listing').del()
})

afterAll(async () => {
  await teardown()
})

describe('listing-adapter', () => {
  describe(listingAdapter.getAllListingsWithApplicants, () => {
    it('returns a formatted list of listings and corresponding applicants', async () => {
      const listing1 = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      const listing2 = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '2' })
      )
      await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing1.id })
      )
      await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing2.id })
      )
      const [fst, snd] = await listingAdapter.getAllListingsWithApplicants()
      expect(fst.applicants).toHaveLength(1)
      expect(fst.applicants?.[0]?.listingId).toBe(fst.id)

      expect(snd.applicants).toHaveLength(1)
      expect(snd.applicants?.[0]?.listingId).toBe(snd.id)
    })
  })

  describe(listingAdapter.createListing, () => {
    it('inserts a new listing in the database', async () => {
      const insertedListing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      expect(insertedListing).toBeDefined()
      const row = await db('listing').first()
      expect(row).toBeDefined()
      expect(row.Id).toEqual(insertedListing.id)
    })
  })

  describe(listingAdapter.getListingByRentalObjectCode, () => {
    it('returns a listing', async () => {
      const insertedListing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      expect(insertedListing).toBeDefined()
      const listingFromDatabase =
        await listingAdapter.getListingByRentalObjectCode(
          insertedListing.rentalObjectCode
        )
      expect(listingFromDatabase?.rentalObjectCode).toBeDefined()
      expect(listingFromDatabase?.rentalObjectCode).toEqual(
        insertedListing.rentalObjectCode
      )
    })
  })

  describe(listingAdapter.getListingById, () => {
    it('returns a listing', async () => {
      const insertedListing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      expect(insertedListing).toBeDefined()
      const listingFromDatabase = await listingAdapter.getListingById(
        insertedListing.id.toString()
      )
      expect(listingFromDatabase?.id).toBeDefined()
      expect(listingFromDatabase?.id).toEqual(insertedListing.id)
    })
  })

  describe(listingAdapter.getApplicantById, () => {
    it('returns an applicant', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )

      const insertedApplication = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.id })
      )
      const applicationFromDatabase = await listingAdapter.getApplicantById(
        insertedApplication.id
      )
      expect(applicationFromDatabase).toBeDefined()
      expect(applicationFromDatabase?.id).toEqual(insertedApplication.id)
    })
  })

  describe(listingAdapter.createApplication, () => {
    it('inserts a new application in the database', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      const insertedApplication = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.id })
      )
      expect(insertedApplication).toBeDefined()
      const row = await db('applicant').first()
      expect(row).toBeDefined()
      expect(row.Id).toEqual(insertedApplication.id)
    })
  })

  describe(listingAdapter.updateApplicantStatus, () => {
    it('updates an applicants status', async () => {
      console.log('implement')
    })
  })

  describe(listingAdapter.getApplicantsByContactCode, () => {
    it('returns an applicant by contact code', async () => {
      //   const listing = await createListing(
      //     factory.listing.build({ rentalObjectCode: '1' })
      //   )
      //
      //   const insertedApplication = await createApplication(
      //     factory.applicant.build({ listingId: listing.id })
      //   )
      //   const applicationFromDatabase = await getApplicantsByContactCode(
      //     insertedApplication.contactCode
      //   )
      //   expect(applicationFromDatabase[0]).toBeDefined()
      //   expect(applicationFromDatabase[0]?.id).toEqual(insertedApplication.id)
    })
  })

  describe(listingAdapter.applicationExists, () => {
    it('returns true if application exists', async () => {
      const listing = await listingAdapter.createListing(
        factory.listing.build({ rentalObjectCode: '1' })
      )
      const insertedApplication = await listingAdapter.createApplication(
        factory.applicant.build({ listingId: listing.id })
      )
      expect(insertedApplication).toBeDefined()

      const result = await listingAdapter.applicationExists(
        insertedApplication.contactCode,
        listing.id
      )

      expect(result).toBe(true)
    })

    it('returns false if application does not exist', async () => {
      const result = await listingAdapter.applicationExists(
        'nonExistingContactCode',
        123456
      )

      expect(result).toBe(false)
    })
  })

  describe(listingAdapter.getExpiredListings, () => {
    it('returns expired listings', async () => {
      console.log('implement')
    })
  })

  describe(listingAdapter.updateListingStatuses, () => {
    it('updates the status of listings from an array of listing ids', async () => {
      console.log('implement')
    })
  })
})
