import {
  DetailedApplicantFactory,
  LeaseFactory,
  ListingFactory,
} from './factory'
import {
  isListingInAreaWithSpecificRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
} from '../residential-area-rental-rules-validator'

describe('isListingInAreaWithSpecificRentalRules', () => {
  it('shouldReturnFalseIfListingIsInAreaWithSpecificRentalRules', async () => {
    const listing = ListingFactory.build({
      districtCode: 'AREA_WHERE_RULES_DO_NOT_APPLY',
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

    expect(result).toBeFalsy()
  })

  it('shouldReturnTrueIfListingIsInAreaWithSpecificRentalRules', async () => {
    const listing = ListingFactory.build({
      districtCode: 'OXB', //todo: update to correct caption
    })

    const result = isListingInAreaWithSpecificRentalRules(listing)

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

/*describe('canApplicantApplyForParkingSpaceInAreaWithSpecificRentalRules', () => {
  it('shouldReturnFalseIfHousingContractAreaDoesNotMatchListingsArea', async () => {
    console.log('implement')
  })

  it('shouldReturnFalseIf', async () => {
    console.log('implement')
  })
})*/
