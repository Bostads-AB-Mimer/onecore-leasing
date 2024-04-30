/*
 * Service for:
 * Fetching and consolidating detailed information on applicants from internal database and xpand
 * Sorting applicants based on rental rules
 */

import {
  Applicant,
  Lease,
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
import app from '../../app'

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

    //todo: write tests
    //todo: test mocks should contain both parking spaces and housing contracts
    let activeAndUpcomingLeases: Lease[] = leases.filter(
      isLeaseActiveOrUpcoming
    )

    for (const lease of activeAndUpcomingLeases) {
      lease.residentalArea = await getResidentialAreaByRentalPropertyId(
        lease.rentalPropertyId
      )
    }

    //todo: write tests
    let housingContracts = parseLeasesForHousingContracts(
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

//helper function to filter all non-terminated and all still active contracts with a last debit date
const isLeaseActiveOrUpcoming = (lease: Lease): boolean => {
  const currentDate = new Date()
  const leaseStartDate = new Date(lease.leaseStartDate)
  const terminationDate = lease.terminationDate
    ? new Date(lease.terminationDate)
    : null

  const lastDebitDate = lease.lastDebitDate
    ? new Date(lease.lastDebitDate)
    : null

  return (
    (!lastDebitDate || currentDate < lastDebitDate) &&
    (!terminationDate || currentDate < terminationDate)
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
  let housingContracts: Lease[] = []
  for (const lease of leases) {
    //use startsWith to handle whitespace issues from xpand
    if (lease.type.startsWith('Bostadskontrakt')) {
      housingContracts.push(lease)
    }
  }

  //only 1 active housing contract found
  if (housingContracts.length == 1) {
    return [housingContracts[0], null]
  }

  //applicant have 1 active and 1 pending contract
  if (housingContracts.length == 2) {
    const currentDate = new Date()
    const curentActiveLease = leases.find(
      (lease) =>
        lease.lastDebitDate !== null && lease.leaseStartDate < currentDate
    )
    const pendingLease = leases.find(
      (lease) =>
        lease.lastDebitDate === null && lease.leaseStartDate > currentDate
    )
    return [curentActiveLease, pendingLease]
  }

  return undefined
}

const parseLeasesForParkingSpaces = (leases: Lease[]): Lease[] | undefined => {
  let parkingSpaces: Lease[] = []
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
  parseWaitingListForInternalParkingSpace,
  parseLeasesForHousingContracts,
  parseLeasesForParkingSpaces,
}
