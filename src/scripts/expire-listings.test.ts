import { updateExpiredListings } from './expire-listings'
import { db, migrate, teardown } from '../services/lease-service/adapters/db'
import * as listingAdapter from '../services/lease-service/adapters/listing-adapter'
import * as factory from '../services/lease-service/tests/factories'
import { ListingStatus } from 'onecore-types'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await db('listing').del()
})

afterAll(async () => {
  await teardown()
})

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
    generateRouteMetadata: jest.fn(() => ({})),
  }
})

describe('updateExpiredListings', () => {
  it('should return empty array if no listings to expire', async () => {
    const result = await updateExpiredListings()
    expect(result).toHaveLength(0)
  })
  it('should set status expired on listings that has expired', async () => {
    const today = new Date()
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const listingThatShouldBeExpired = await listingAdapter.createListing(
      factory.listing.build({
        id: 123,
        rentalObjectCode: '1',
        publishedTo: oneWeekAgo,
        status: ListingStatus.Active,
      })
    )

    const result = await updateExpiredListings()
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(listingThatShouldBeExpired.id)

    const listingFromDb = await listingAdapter.getListingById(
      listingThatShouldBeExpired.id.toString()
    )

    expect(listingFromDb?.status).toEqual(ListingStatus.Expired)
  })
})

describe('createOffersForExpiredListings', () => {
  it('should create offers for expired listings', async () => {
    console.log('implement')
  })
  it('should update status on newly offered listings', async () => {
    console.log('implement')
  })
})
