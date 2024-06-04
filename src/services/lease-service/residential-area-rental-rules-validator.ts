//Centrum, Oxbacken,

import {
  ApplicantStatus,
  DetailedApplicant,
  Listing,
  ResidentialArea,
} from 'onecore-types'

//todo: rename this file with a better name

const residentialAreaWithSpecificRentalRules: ResidentialArea[] = [
  {
    code: 'CEN',
    caption: 'Centrum',
  },
  {
    code: 'OXB',
    caption: 'Oxbacken',
  },
]

const isListingInAreaWithSpecificRentalRules = (listing: Listing) => {
  return residentialAreaWithSpecificRentalRules.some(
    (area) => area.code === listing.districtCode
  )
}

//todo: make same util as above but for rental properties

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

//todo: return tuple? canApplyBool and reason String
const canApplicantApplyForParkingSpaceInAreaWithSpecificRentalRules = (
  applicant: DetailedApplicant,
  listing: Listing
) => {
  //if (isListingInAreaWithSpecificRentalRules(listing)) {
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
  /*}
  //todo: this case is a bit weird?
  return true //listing is not in area with specific rental rules*/
}

const validateIfUserHas = (applicant: DetailedApplicant, listing: Listing) => {
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

//todo: rename
// const validateAndUpdateApplicantBasedOnRentalRules = (
//   listing: Listing,
//   applicants: DetailedApplicant[]
// ): DetailedApplicant[] => {
//   console.log('implement')
//   const updatedApplicants: DetailedApplicant[] = []
//   //todo: don't mutate org object
//   for (const applicant of applicants) {
//         const updatedApplicant =
//       validateThatApplicantIsEligibleForParkingSpaceInArea(listing, applicant)
//     updatedApplicants.push(updatedApplicant)
//   }
//
//   return updatedApplicants
// }

export {
  isListingInAreaWithSpecificRentalRules,
  //validateAndUpdateApplicantBasedOnRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
  canApplicantApplyForParkingSpaceInAreaWithSpecificRentalRules,
}
