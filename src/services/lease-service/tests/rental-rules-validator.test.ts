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
  it('shouldReturnFalseIfListingIsNotInAreaWithSpecificRentalRules', () => {
    const listing = ListingFactory.build({
      districtCode: 'AREA_WHERE_RULES_DO_NOT_APPLY',
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfListingIsInAreaWithSpecificRentalRules', () => {
    const listing = ListingFactory.build({
      districtCode: 'OXB',
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

    expect(result).toBeTruthy()
  })
})

describe('doesPropertyHaveSpecificRentalRules', () => {
  it('shouldReturnFalseIfPropertyDoesNotHaveSpecificRentalRules', () => {
    const estateCode = 'ESTATE_CODE_WITHOUT_SPECIFIC_RENTAL_RULES'
    const result =
      doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(estateCode)

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfPropertyHaveSpecificRentalRules', () => {
    const estateCode = '24104'

    const result =
      doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules(estateCode)

    expect(result).toBeTruthy()
  })
})

describe('isHousingContractsOfApplicantInSameAreaAsListing', () => {
  it('shouldReturnFalseIfNoHousingContracts', () => {
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

  it('shouldReturnFalseIfCurrentHousingContractInOtherAreaThanListing', () => {
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

  it('shouldReturnFalseIfUpcomingHousingContractInOtherAreaThanListing', () => {
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

  it('shouldReturnTrueIfCurrentHousingContractInSameAreaAsListing', () => {
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

  it('shouldReturnTrueIfUpcomingHousingContractInSameAreaAsListing', () => {
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
  it('shouldReturnFalseIfApplicantDoesNotHaveAnyParkingSpaceContracts', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: undefined,
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      ListingFactory.build(),
      detailedApplicant
    )

    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfApplicantDoesNotHaveParkingSpaceInSameAreaAsListing', () => {
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

  it('shouldReturnTrueIfApplicantHaveParkingSpaceInSameAreaAsListing', () => {
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
      .times(Infinity) //allow multiple calls to this mock
      .reply(200, {})
  })

  afterEach(() => {
    nock.cleanAll()
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
    const propertyInfoRentalObjectCodeForHousingContract = '123'
    nock(config.core.url)
      .get(
        `/propertyInfoFromXpand/${propertyInfoRentalObjectCodeForHousingContract}`
      )
      .reply(200, { estateCode: 'NON_MATCHING_ESTATE_CODE' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        rentalPropertyId: propertyInfoRentalObjectCodeForHousingContract,
      }),
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeFalsy()
  })

  it('shouldReturnFalseIfNoUpcomingHousingContractAndCurrentHousingContractInWrongProperty', async () => {
    const propertyInfoRentalObjectCodeForHousingContract = '123'
    nock(config.core.url)
      .get(
        `/propertyInfoFromXpand/${propertyInfoRentalObjectCodeForHousingContract}`
      )
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
    const propertyInfoRentalObjectCodeForHousingContract = '123'
    nock(config.core.url)
      .get(
        `/propertyInfoFromXpand/${propertyInfoRentalObjectCodeForHousingContract}`
      )
      .reply(200, { estateCode: '24104' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        rentalPropertyId: propertyInfoRentalObjectCodeForHousingContract,
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
    const propertyInfoRentalObjectCodeForHousingContract = '123'
    nock(config.core.url)
      .get(
        `/propertyInfoFromXpand/${propertyInfoRentalObjectCodeForHousingContract}`
      )
      .reply(200, { estateCode: '24104' })

    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        rentalPropertyId: propertyInfoRentalObjectCodeForHousingContract,
      }),
    })

    const result = await doesUserHaveHousingContractInSamePropertyAsListing(
      detailedApplicant,
      mockedParkingSpacePropertyInf
    )
    expect(result).toBeTruthy()
  })
})
