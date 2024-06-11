import {
  DetailedApplicantFactory,
  LeaseFactory,
  ListingFactory,
} from './factory'
import {
  isListingInAreaWithSpecificRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  doesUserHaveHousingContractInSamePropertyAsListing,
} from '../rental-rules-validator'
import config from '../../../common/config'
import nock from 'nock'

describe('isListingInAreaWithSpecificRentalRules', () => {
  it('shouldReturnFalseIfListingIsNotInAreaWithSpecificRentalRules', async () => {
    const listing = ListingFactory.build({
      districtCode: 'AREA_WHERE_RULES_DO_NOT_APPLY',
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfListingIsInAreaWithSpecificRentalRules', async () => {
    const listing = ListingFactory.build({
      districtCode: 'OXB',
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

    expect(result).toBeTruthy()
  })
})

describe('doesPropertyHaveSpecificRentalRules', () => {
  it('shouldReturnFalseIfPropertyDoesNotHaveSpecificRentalRules', async () => {
    const estateCode = 'ESTATE_CODE_WITHOUT_SPECIFIC_RENTAL_RULES'
    const result =
      doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(estateCode)

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfPropertyHaveSpecificRentalRules', async () => {
    const estateCode = '24104'

    const result =
      doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(estateCode)

    expect(result).toBeTruthy()
  })
})

describe('isHousingContractsOfApplicantInSameAreaAsListing', () => {
  it('shouldReturnFalseIfNoHousingContracts', async () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: undefined,
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      ListingFactory.build(),
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfCurrentHousingContractInOtherAreaThanListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        residentialArea: { code: 'XYZ' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfUpcomingHousingContractInOtherAreaThanListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        residentialArea: { code: 'XYZ' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfCurrentHousingContractInSameAreaAsListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        residentialArea: { code: 'ABC' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeTruthy()
  })

  it('shouldReturnTrueIfUpcomingHousingContractInSameAreaAsListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        residentialArea: { code: 'ABC' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })
})

describe('doesApplicantHaveParkingSpaceContractsInSameAreaAsListing', () => {
  it('shouldReturnFalseIfApplicantDoesNotHaveAnyParkingSpaceContracts', async () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: undefined,
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      ListingFactory.build(),
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfApplicantDoesNotHaveParkingSpaceInSameAreaAsListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })

    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: [
        LeaseFactory.build({ residentialArea: { code: 'XYZ' } }),
      ],
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })
  //todo: remove all redudant async...
  it('shouldReturnTrueIfApplicantHaveParkingSpaceInSameAreaAsListing', async () => {
    const listing = ListingFactory.build({ districtCode: 'ABC' })

    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: [
        LeaseFactory.build({ residentialArea: { code: 'XYZ' } }),
        LeaseFactory.build({ residentialArea: { code: 'ABC' } }),
      ],
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      listing,
      detailedApplicant
    )

    expect(result).toBeTruthy()
  })
})

const mockedParkingSpacePropertyInf = {
  data: {
    estateCode: '24104',
  },
}

describe('doesUserHaveHousingContractInSamePropertyAsListing', () => {
  beforeEach(() => {
    nock(config.core.url)
      .post('/auth/generatetoken', {
        username: config.core.username,
        password: config.core.password,
      })
      .reply(200, {})
  })

  it('shouldReturnFalseIfNoHousingContract', async () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: undefined,
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfNoCurrentHousingContractAndUpcomingHousingContractInWrongProperty', async () => {
    nock(config.core.url)
      .get('/rentalPropertyInfo/123')
      .reply(200, { estateCode: 'NON_MATCHING_ESTATE_CODE' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        rentalPropertyId: '123',
      }),
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfNoUpcomingHousingContractAndCurrentHousingContractInWrongProperty', async () => {
    nock(config.core.url)
      .get('/rentalPropertyInfo/123')
      .reply(200, { estateCode: 'NON_MATCHING_ESTATE_CODE' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        rentalPropertyId: '123',
      }),
      upcomingHousingContract: undefined,
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfCurrentHousingContractInSameProperty', async () => {
    nock(config.core.url)
      .get('/rentalPropertyInfo/123')
      .reply(200, { estateCode: '24104' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        rentalPropertyId: '123',
      }),
      upcomingHousingContract: undefined,
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeTruthy()
  })

  it('shouldReturnTrueIfUpcomingHousingContractInSameProperty', async () => {
    nock(config.core.url)
      .get('/rentalPropertyInfo/123')
      .reply(200, { estateCode: '24104' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        rentalPropertyId: '123',
      }),
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeTruthy()
  })
})
