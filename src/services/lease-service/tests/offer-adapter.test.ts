import { ApplicantStatus, OfferStatus } from 'onecore-types'
import * as offerAdapter from '../adapters/offer-adapter'
import * as dbUtils from '../adapters/utils'

const dbOffer = {
  Id: 1,
  SentAt: null,
  ExpiresAt: new Date().toISOString(),
  Status: OfferStatus.Active,
  AnsweredAt: null,
  SelectionSnapshot: '[]',
  ListingId: 1,
  ApplicantId: 1,
}

const dbApplicant = {
  Id: 1,
  Name: 'Foo',
  ContactCode: 'foo',
  ApplicationDate: new Date().toISOString(),
  ApplicationType: 'foo',
  Status: ApplicantStatus.Active,
  ListingId: 1,
  NationalRegistrationNumber: 'foo',
}
jest.mock('knex', () => () => ({
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  transaction: jest.fn().mockReturnThis(),
  then: jest
    .fn()
    .mockImplementation((callback) => callback([dbOffer, dbApplicant])),
}))

describe(offerAdapter.create, () => {
  it('returns a formatted list of listings and corresponding applicants', async () => {
    const result = await offerAdapter.create({
      expiresAt: new Date(),
      listingId: 1,
      applicantId: 1,
      selectedApplicants: [],
      status: OfferStatus.Active,
    })

    expect(result).toEqual({
      id: 1,
      sentAt: null,
      expiresAt: expect.any(String),
      status: OfferStatus.Active,
      answeredAt: null,
      selectedApplicants: [],
      listingId: 1,
      offeredApplicant: dbUtils.pascalToCamel(dbApplicant),
    })
  })
})
