import { DetailedApplicantFactory, LeaseFactory } from './factory'
import {
  isListingInAreaWithSpecificRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
} from '../residential-area-rental-rules-validator'

describe('isListingInAreaWithSpecificRentalRules', () => {
  it('should returns false if listing is not in area with specific rental rules', () => {
    const result = isListingInAreaWithSpecificRentalRules(
      'AREA_WHERE_RULES_DO_NOT_APPLY'
    )
    expect(result).toBe(false)
  })

  it('should return true if listing is in area with specific rental rules', () => {
    const result = isListingInAreaWithSpecificRentalRules('OXB')
    expect(result).toBe(true)
  })
})

describe('isHousingContractsOfApplicantInSameAreaAsListing', () => {
  it('should return false if no housing contracts', () => {
    const result = isHousingContractsOfApplicantInSameAreaAsListing('MAL', {
      currentHousingContract: undefined,
      upcomingHousingContract: undefined,
    })

    expect(result).toBe(false)
  })

  it('should return false if current housing contract is in other area than listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        residentialArea: { code: 'XYZ' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(false)
  })

  it('should return false if upcoming housing contract in other area than listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        residentialArea: { code: 'XYZ' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(false)
  })

  it('should return true if current housing contract in same area as listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: LeaseFactory.build({
        residentialArea: { code: 'ABC' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(true)
  })

  it('should return true if upcomming housing contract in same area as listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      currentHousingContract: undefined,
      upcomingHousingContract: LeaseFactory.build({
        residentialArea: { code: 'ABC' },
      }),
    })

    const result = isHousingContractsOfApplicantInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(false)
  })
})

describe('doesApplicantHaveParkingSpaceContractsInSameAreaAsListing', () => {
  it('should return false if applicant does not have any parking space contracts', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: undefined,
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      'MAL',
      detailedApplicant
    )

    expect(result).toBe(false)
  })

  it('should return false if applicant does not have parking space in same area as listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: [
        LeaseFactory.build({ residentialArea: { code: 'XYZ' } }),
      ],
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(false)
  })

  it('should return true if applicant have parking space in same area as listing', () => {
    const detailedApplicant = DetailedApplicantFactory.build({
      parkingSpaceContracts: [
        LeaseFactory.build({ residentialArea: { code: 'XYZ' } }),
        LeaseFactory.build({ residentialArea: { code: 'ABC' } }),
      ],
    })

    const result = doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
      'ABC',
      detailedApplicant
    )

    expect(result).toBe(true)
  })
})
