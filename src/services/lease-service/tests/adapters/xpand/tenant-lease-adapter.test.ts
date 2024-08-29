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

import * as tenantLeaseAdapter from '../../../adapters/xpand/tenant-lease-adapter'

jest.mock('knex', () => () => ({
  raw: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: jest
    .fn()
    .mockImplementationOnce((callback) =>
      callback([
        {
          contactCode: 'P123456',
          firstName: 'Test ',
          lastName: 'Testman  ',
          fullName: 'Test Testman   ',
          nationalRegistrationNumber: '121212121212',
          birthDate: '1212-12-12',
          street: 'Gatvägen 12    ',
          postalCode: '12345 ',
          city: null,
          emailAddress: 'noreply@mimer.nu  ',
          keycmobj: '12345',
          contactKey: '_ADBAEC',
        },
      ])
    )
    .mockImplementationOnce((callback) => {
      callback([
        {
          phoneNumber: '070123456 ',
          type: 'mobil  ',
          isMainNumber: true,
        },
      ])
    })
    .mockImplementationOnce((callback) => {
      callback([])
    }),
}))

describe(tenantLeaseAdapter.getContactByContactCode, () => {
  it('returns a contact with trimmed string fields', async () => {
    const contact = await tenantLeaseAdapter.getContactByContactCode(
      'P123456',
      undefined
    )

    expect(contact).toStrictEqual({
      ok: true,
      data: {
        contactCode: 'P123456',
        contactKey: '_ADBAEC',
        firstName: 'Test',
        lastName: 'Testman',
        fullName: 'Test Testman',
        leaseIds: [],
        nationalRegistrationNumber: '121212121212',
        birthDate: '1212-12-12',
        address: {
          street: 'Gatvägen 12',
          number: '',
          postalCode: '12345',
          city: null,
        },
        phoneNumbers: [
          {
            phoneNumber: '070123456',
            type: 'mobil',
            isMainNumber: true,
          },
        ],
        emailAddress: 'redacted',
        isTenant: false,
      },
    })
  })
})

describe(tenantLeaseAdapter.getLeasesForContactCode, () => {
  // it('returns a lease ')
})
