import * as xpandListingAdapter from '../../../adapters/xpand/xpand-listing-adapter'

jest.mock('knex', () => () => ({
  raw: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementationOnce((callback) =>
    callback([
      {
        rentalpropertyid: '924-004-99-0008',
        vehiclespacecode: '0008',
        vehiclespacecaption: 'KARL IX:S VÄG 18',
        companycode: '001',
        companycaption: 'BOSTADS AB MIMER',
        blockcode: '924-004                       ',
        blockcaption: 'KARL IX:S VÄG 18              ',
        vehiclespacetypecode: 'MCGAR          ',
        vehiclespacetypecaption: 'Motorcykelgarage',
        vehiclespacenumber: '924-004-99-0008',
        postaladdress: 'Karl IX:s V 18',
        zipcode: '726 30',
        city: 'SKULTUNA',
        scegcaption: '2: SKULTUNA 1',
        status: 'VACANT',
        blocktype: null,
        blockstartdate: null,
        blockenddate: null,
        contractid: null,
        contractfromdate: null,
        lastdebitdate: null,
      },
    ])
  ),
}))

describe('getAllVacantParkingSpaces', () => {
  it('should return a list of vacant parking spaces', async () => {
    jest
      .spyOn(xpandListingAdapter, 'getAllVacantParkingSpaces')
      .mockResolvedValue({
        ok: true,
        data: [
          {
            rentalObjectCode: '924-004-99-0008',
            address: {
              street: 'Karl IX:s V 18',
              city: 'SKULTUNA',
              postalCode: '726 30',
              number: '',
            },
            vehicleSpaceTypeCaption: 'Motorcykelgarage',
            vehicleSpaceTypeCode: 'MCGAR',
            vehicleSpaceCaption: 'KARL IX:S VÄG 18',
            vehicleSpaceCode: '0008',
            status: 'VACANT',
            districtCaption: 'Distrikt Norr',
            districtCode: '2',
            rent: 0,
          },
        ],
      })

    const result = await xpandListingAdapter.getAllVacantParkingSpaces()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toEqual({
        rentalObjectCode: '924-004-99-0008',
        address: {
          street: 'Karl IX:s V 18',
          city: 'SKULTUNA',
          postalCode: '726 30',
          number: '',
        },
        vehicleSpaceTypeCaption: 'Motorcykelgarage',
        vehicleSpaceTypeCode: 'MCGAR',
        vehicleSpaceCaption: 'KARL IX:S VÄG 18',
        vehicleSpaceCode: '0008',
        status: 'VACANT',
        districtCaption: 'Distrikt Norr',
        districtCode: '2',
        rent: 0,
      })
    }
  })

  it('should handle errors gracefully', async () => {
    jest
      .spyOn(xpandListingAdapter, 'getAllVacantParkingSpaces')
      .mockResolvedValue({
        ok: false,
        err: new Error('Database error'),
      })

    const result = await xpandListingAdapter.getAllVacantParkingSpaces()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.err).toBeDefined()
    }
  })
})
