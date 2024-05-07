/*
 * Service for:
 * Fetching and consolidating detailed information on applicants from internal database and xpand
 * Sorting applicants based on rental rules
 */

import {
  Applicant,
  Lease,
  Listing,
  ParkingSpaceApplicationCategory,
  parkingSpaceApplicationCategoryTranslation,
  WaitingList,
} from 'onecore-types'
import { getWaitingList } from './adapters/xpand/xpand-soap-adapter'
import {
  getContactByContactCode,
  getResidentialAreaByRentalPropertyId,
  getLeasesForContactCode,
} from './adapters/xpand/tenant-lease-adapter'

const getDetailedApplicantInformation = async (applicant: Applicant) => {
  try {
    const applicantFromXpand = await getContactByContactCode(
      applicant.contactCode,
      'false'
    )

    if (!applicantFromXpand) {
      throw new Error(
        `Applicant ${applicant.contactCode} not found in contact query`
      )
    }

    const applicantWaitingList = await getWaitingList(
      applicantFromXpand.nationalRegistrationNumber
    )
    const waitingListForInternalParkingSpace =
      parseWaitingListForInternalParkingSpace(applicantWaitingList)

    if (!waitingListForInternalParkingSpace) {
      throw new Error(
        `Waiting list for internal parking space not found for applicant ${applicant.contactCode}`
      )
    }

    const leases = await getLeasesForContactCode(
      applicant.contactCode,
      'true', //this filter does not consider upcoming leases
      undefined //do not include contacts
    )

    if (!leases) {
      throw new Error(`Leases not found for applicant ${applicant.contactCode}`)
    }

    const activeAndUpcomingLeases: Lease[] = leases.filter(
      isLeaseActiveOrUpcoming
    )

    for (const lease of activeAndUpcomingLeases) {
      lease.residentialArea = await getResidentialAreaByRentalPropertyId(
        lease.rentalPropertyId
      )
    }

    const housingContracts = parseLeasesForHousingContracts(
      activeAndUpcomingLeases
    )
    if (!housingContracts) {
      throw new Error(
        `Housing contracts not found for applicant ${applicant.contactCode}`
      )
    }

    const parkingSpaces = parseLeasesForParkingSpaces(activeAndUpcomingLeases)

    //todo: define the proper interface type to return
    return {
      ...applicant,
      queuePoints: waitingListForInternalParkingSpace.queuePoints,
      address: applicantFromXpand.address,
      currentHousingContract: housingContracts[0],
      upcomingHousingContract: housingContracts[1],
      parkingSpaceContracts: parkingSpaces,
    }
  } catch (error) {
    console.error('Error in getDetailedApplicantInformation:', error)
    throw error // Re-throw the error to propagate it upwards
  }
}

//todo: should use and return defined interface type
const sortApplicantsBasedOnRentalRules = (
  listing: Listing,
  applicants: any[]
): any[] => {
  for (const applicant of applicants) {
    assignPriorityToApplicantBasedOnRentalRules(listing, applicant)
  }

  return applicants
}

//todo: should use and return defined interface type
const assignPriorityToApplicantBasedOnRentalRules = (
  listing: Listing,
  applicant: any
): any => {
  //todo: add base validation that applicant belongs to same listing?

  //priority  1
  //Hyresgäst utan bilplats, gällande/kommande kontrakt i området
  //Applicant has no active contract for parking space and is current or future tenant in same area as listing
  if (!applicant.parkingSpaceContracts.length) {
    if (
      applicant.currentHousingContract.residentialArea.code ===
        listing.districtCode ||
      applicant.upcomingHousingContract.residentialArea.code ===
        listing.districtCode
    ) {
      applicant.priority = 1
      return applicant
    }

    // if (
    //   applicant.upcomingHousingContract.residentialArea.code ===
    //   listing.districtCode
    // ) {
    //   applicant.priority = 1
    //   return applicant
    // }
  }

  //Hyresgäst med bilplats, önskar byta
  //Applicant has 1 active contract for parking space but wishes to replace current parking space
  //todo: write test tomorrow
  if (
    applicant.parkingSpaceContracts.length === 1 &&
    applicant.applicationType === 'Replace'
  ) {
    applicant.priority = 1
    return applicant
  }

  //priority 2
  //Hyresgäst har en bilplats, söker en till.
  if (
    applicant.parkingSpaceContracts.length === 1 &&
    applicant.applicationType === 'Additional'
  ) {
    applicant.priority = 2
    return applicant
  }
  //Hyresgäst med två/flera bilplatser, önskar byta mot annan
  if (
    applicant.parkingSpaceContracts.length > 1 &&
    applicant.applicationType === 'Replace'
  ) {
    applicant.priority = 2
    return applicant
  }

  //priority 3
  //Hyresgäst med fler än två bilplatser söker en till

  applicant.priority = 3
  return applicant
}

//helper function to filter all non-terminated and all still active contracts with a last debit date
const isLeaseActiveOrUpcoming = (lease: Lease): boolean => {
  const currentDate = new Date()
  const terminationDate = lease.terminationDate
    ? new Date(lease.terminationDate)
    : null

  const lastDebitDate = lease.lastDebitDate
    ? new Date(lease.lastDebitDate)
    : null

  //determine if lastDebitDate and terminationDate is set
  //if so, the date(s) needs to be in the future for the lease to be active
  const isCurrentDateEarlierThanLastDebitDate =
    !lastDebitDate || currentDate < lastDebitDate
  const isCurrentDateBeforeTerminationDate =
    !terminationDate || currentDate < terminationDate

  return (
    isCurrentDateEarlierThanLastDebitDate && isCurrentDateBeforeTerminationDate
  )
}

const parseWaitingListForInternalParkingSpace = (
  waitingLists: WaitingList[]
): WaitingList | undefined => {
  for (const waitingList of waitingLists) {
    if (
      parkingSpaceApplicationCategoryTranslation[
        waitingList.waitingListTypeCaption
      ] == ParkingSpaceApplicationCategory.internal
    ) {
      return waitingList
    }
  }
  return undefined
}

//this function is based on xpand rules that there can be max 1 current active contract and 1 upcoming contract
const parseLeasesForHousingContracts = (
  leases: Lease[]
):
  | [currentHousingContract: Lease, upcomingHousingContract: Lease | undefined]
  | undefined => {
  const housingContracts: Lease[] = []
  for (const lease of leases) {
    //use startsWith to handle whitespace issues from xpand
    if (lease.type.startsWith('Bostadskontrakt')) {
      housingContracts.push(lease)
    }
  }

  //only 1 active housing contract found
  if (housingContracts.length == 1) {
    return [housingContracts[0], undefined]
  }

  //applicant have 1 active and 1 pending contract
  if (housingContracts.length == 2) {
    const currentDate = new Date()
    const currentActiveLease = leases.find(
      (lease) =>
        (lease.lastDebitDate === null || lease.lastDebitDate === undefined) &&
        lease.leaseStartDate <= currentDate
    )

    if (currentActiveLease == undefined) {
      throw new Error('could not find any active lease')
    }

    const pendingLease = leases.find(
      (lease) =>
        (lease.lastDebitDate === null || lease.lastDebitDate === undefined) &&
        lease.leaseStartDate > currentDate
    )

    if (pendingLease == undefined) {
      throw new Error('could not find any pending lease')
    }

    return [currentActiveLease, pendingLease]
  }

  return undefined
}

const parseLeasesForParkingSpaces = (leases: Lease[]): Lease[] | undefined => {
  const parkingSpaces: Lease[] = []
  for (const lease of leases) {
    //use startsWith to handle whitespace issues from xpand
    if (lease.type.startsWith('P-Platskontrakt')) {
      parkingSpaces.push(lease)
    }
  }
  return parkingSpaces
}

export {
  getDetailedApplicantInformation,
  sortApplicantsBasedOnRentalRules,
  assignPriorityToApplicantBasedOnRentalRules,
  parseWaitingListForInternalParkingSpace,
  parseLeasesForHousingContracts,
  parseLeasesForParkingSpaces,
  isLeaseActiveOrUpcoming,
}
