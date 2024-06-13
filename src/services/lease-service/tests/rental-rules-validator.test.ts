import {
  DetailedApplicantFactory,
  LeaseFactory,
  ListingFactory,
} from './factory'
import {
  isListingInAreaWithSpecificRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
} from '../rental-rules-validator'

//todo: refactor this as residential-area-rental-rules-validator?
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
