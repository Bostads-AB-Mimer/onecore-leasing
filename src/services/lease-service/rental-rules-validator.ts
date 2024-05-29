//Centrum, Oxbacken,

import { DetailedApplicant, Listing, ResidentialArea } from 'onecore-types'

//todo: rename this file with a better name

const residentialAreaWithSpecificRentalRules: ResidentialArea[] = [
  {
    code: '', //todo: find correct code
    caption: 'Centrum',
  },
  {
    code: 'OXB', //todo: find correct code
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

  //check that listing is in an area where these rental rules apply

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
  applicant: DetailedApplicant,
  listing: Listing
) => {
  if (!applicant.parkingSpaceContracts) {
    return false
  }

  return applicant.parkingSpaceContracts.some(
    (parkingSpaceContract) =>
      parkingSpaceContract.residentialArea?.code === listing.districtCode
  )
}

//todo: rename
/*const validateAndUpdateApplicantBasedOnRentalRules = (
  listing: Listing,
  applicants: DetailedApplicant[]
): DetailedApplicant[] => {
  console.log('implement')
  const updatedApplicants: DetailedApplicant[] = []
  //todo: don't mutate org object
  for (const applicant of applicants) {
        const updatedApplicant =
      validateThatApplicantIsEligibleForParkingSpaceInArea(listing, applicant)
    updatedApplicants.push(updatedApplicant)
  }

  return updatedApplicants
}*/

export {
  isListingInAreaWithSpecificRentalRules,
  //validateAndUpdateApplicantBasedOnRentalRules,
  isHousingContractsOfApplicantInSameAreaAsListing,
  doesApplicantHaveParkingSpaceContractsInSameAreaAsListing,
}
