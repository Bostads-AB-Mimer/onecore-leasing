import { DetailedApplicant, Listing, ResidentialArea } from 'onecore-types'
import { getPropertyInfoFromCore } from './adapters/core-adapter'

//todo: we might need to consider and validate if a housing contract is ending

const residentialAreasWithSpecificRentalRules: ResidentialArea[] = [
  {
    code: 'CEN',
    caption: 'Centrum', //skip?
  },
  {
    code: 'OXB',
    caption: 'Oxbacken', //skip?
  },
]

//todo: add type?
const propertiesWithSpecificRentalRules: any[] = [
  {
    estateCode: '24104', //Sjöodjuret 2
  },
  {
    estateCode: '23002', //ROTORN 13
  },
  {
    estateCode: '23003', //ISOLATORN 14
  },
]

const isListingInAreaWithSpecificRentalRules = (listing: Listing) => {
  return residentialAreasWithSpecificRentalRules.some(
    (area) => area.code === listing.districtCode
  )
}

const doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules = (
  estateCode: string
) => {
  return propertiesWithSpecificRentalRules.some(
    (property) => estateCode == property.estateCode
  )
}

const isHousingContractsOfApplicantInSameAreaAsListing = (
  listing: Listing,
  applicant: DetailedApplicant
): boolean => {
  const currentHousingContractDistrictCode =
    applicant.currentHousingContract?.residentialArea?.code
  const upcomingHousingContractDistrictCode =
    applicant.upcomingHousingContract?.residentialArea?.code

  //applicant has no housing contracts
  if (
    !currentHousingContractDistrictCode &&
    !upcomingHousingContractDistrictCode
  ) {
    return false
  }

  //applicants current housing contract area does not match listings area
  if (
    currentHousingContractDistrictCode &&
    currentHousingContractDistrictCode != listing.districtCode
  ) {
    return false
  }

  //applicant has no current housing contract, but an upcoming housing contract
  if (
    !currentHousingContractDistrictCode &&
    upcomingHousingContractDistrictCode
  ) {
    //applicants upcoming housing contract area does not match listings area
    if (currentHousingContractDistrictCode != listing.districtCode) {
      return false
    }
  }

  return true
}

const doesApplicantHaveParkingSpaceContractsInSameAreaAsListing = (
  listing: Listing,
  applicant: DetailedApplicant
) => {
  if (!applicant.parkingSpaceContracts) {
    return false
  }

  return applicant.parkingSpaceContracts.some(
    (parkingSpaceContract) =>
      parkingSpaceContract.residentialArea?.code === listing.districtCode
  )
}

const canApplicantApplyForParkingSpaceInAreaWithSpecificRentalRules = (
  applicant: DetailedApplicant,
  listing: Listing
) => {
  if (isHousingContractsOfApplicantInSameAreaAsListing(listing, applicant)) {
    if (
      doesApplicantHaveParkingSpaceContractsInSameAreaAsListing(
        listing,
        applicant
      )
    ) {
      //user has an existing parking space contract in same area as listing
      return false
    }
    //user has no current parking space contract and a housing contract in same area as listing
    return true
  }
  //the user does not live in the area
  return false
}

async function doesUserHaveHousingContractInSamePropertyAsListing(
  detailedApplicant: DetailedApplicant,
  parkingSpacePropertyInfo: any
) {
  let estateCodeOfCurrentHousingContract = undefined
  let estateCodeOfUpcomingHousingContract = undefined

  if (detailedApplicant.currentHousingContract) {
    const response = await getPropertyInfoFromCore(
      detailedApplicant.currentHousingContract.rentalPropertyId
    )
    estateCodeOfCurrentHousingContract = response.data.estateCode
  }

  if (detailedApplicant.upcomingHousingContract) {
    const response = await getPropertyInfoFromCore(
      detailedApplicant.upcomingHousingContract.rentalPropertyId
    )
    estateCodeOfUpcomingHousingContract = response.data.estateCode
  }

  const applicantHasCurrentHousingContractInProperty =
    estateCodeOfCurrentHousingContract &&
    estateCodeOfCurrentHousingContract ===
      parkingSpacePropertyInfo.data.estateCode

  const applicantHasUpcomingHousingContractInProperty =
    estateCodeOfUpcomingHousingContract &&
    estateCodeOfUpcomingHousingContract ===
      parkingSpacePropertyInfo.data.estateCode

  console.log(
    'estateCodeOfCurrentHousingContract: ',
    estateCodeOfCurrentHousingContract
  )
  console.log(
    'estateCodeOfUpcomingHousingContract: ',
    estateCodeOfUpcomingHousingContract
  )

  console.log(
    'applicantHasCurrentHousingContractInProperty: ',
    applicantHasCurrentHousingContractInProperty
  )
  console.log(
    'applicantHasUpcomingHousingContractInProperty: ',
    applicantHasUpcomingHousingContractInProperty
  )
  return (
    applicantHasCurrentHousingContractInProperty ||
    applicantHasUpcomingHousingContractInProperty
  )
}

export {
  isListingInAreaWithSpecificRentalRules,
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  canApplicantApplyForParkingSpaceInAreaWithSpecificRentalRules,
  doesUserHaveHousingContractInSamePropertyAsListing,
}
