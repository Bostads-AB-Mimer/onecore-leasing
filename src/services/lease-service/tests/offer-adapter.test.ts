import * as offerAdapter from '../adapters/offer-adapter'

jest.mock('knex', () => () => () => ({
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((callback) =>
    callback({
      Id: 1,
      SentAt: null,
      ExpiresAt: new Date().toISOString(),
      Status: offerAdapter.OfferStatus.Active,
      AnsweredAt: null,
      SelectionSnapshot: '[]',
      ListingId: 1,
      ApplicantId: 1,
    })
  ),
}))

describe(offerAdapter.create, () => {
  it('returns a formatted list of listings and corresponding applicants', async () => {
    const result = await offerAdapter.create({
      expiresAt: new Date(),
      listingId: 1,
      offeredApplicant: 1,
      selectedApplicants: [],
      status: offerAdapter.OfferStatus.Active,
    })

    expect(result).toEqual({
      id: 1,
      sentAt: null,
      expiresAt: expect.any(String),
      status: offerAdapter.OfferStatus.Active,
      answeredAt: null,
      selectedApplicants: [],
      listingId: 1,
      offeredApplicant: 1,
    })
  })
})
