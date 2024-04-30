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
      'false',
      undefined
    )

    if (!leases) {
      throw new Error(`Leases not found for applicant ${applicant.contactCode}`)
    }

    for (const lease of leases) {
      lease.residentalArea = await getResidentialAreaByRentalPropertyId(
        lease.rentalPropertyId
      )
    }

    //todo: validate and extract main contract
    const housingContract = parseLeasesForHousingContract(leases)
    console.log('housingContract: ', housingContract)

    //todo: make sure that these parkingSpaces are active and not terminated
    const parkingSpaces = parseLeasesForParkingSpaces(leases)

    //todo: define the proper interface type to return
    return {
      ...applicant,
      queuePoints: waitingListForInternalParkingSpace.queuePoints,
      address: applicantFromXpand.address,
      housingContract: housingContract,
      parkingSpaceContracts: parkingSpaces,
    }
  } catch (error) {
    console.error('Error in getDetailedApplicantInformation:', error)
    throw error // Re-throw the error to propagate it upwards
  }
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

const parseLeasesForHousingContract = (leases: Lease[]): Lease | undefined => {
  for (const lease of leases) {
    //use startsWith to handle whitespace issues from xpand
    if (lease.type.startsWith('Bostadskontrakt')) {
      return lease
    }
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
  parseLeasesForHousingContract,
  parseLeasesForParkingSpaces,
}
