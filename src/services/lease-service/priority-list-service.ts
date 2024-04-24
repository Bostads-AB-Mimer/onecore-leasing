//todo: where does this belong?
//todo: this is a helper service for:
//todo: 1. fetching detailed information on applicants
//todo: 2. calculating the list of applicants based on the rental rules

import {
  Applicant,
  ParkingSpaceApplicationCategory,
  parkingSpaceApplicationCategoryTranslation,
  WaitingList,
} from 'onecore-types'
import { getWaitingList } from './adapters/xpand/xpand-soap-adapter'
import {
  getContactByContactCode,
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
      'false'
    )

    console.log('leases', leases)

    if (!leases) {
      throw new Error(`Leases not found for applicant ${applicant.contactCode}`)
    }

    //todo: validate and extract main contract
    //todo: extract all parking spaces

    // Consolidate data into a minimal viable object
    return {
      ...applicantFromXpand,
      // ...waitingListForInternalParkingSpace,
      // ...leases,
    }
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error in getDetailedApplicantInformation:', error)
    throw error // Re-throw the error to propagate it upwards
  }
}

const parseWaitingListForInternalParkingSpace = (
  waitingList: WaitingList[]
): WaitingList | undefined => {
  for (const item of waitingList) {
    if (
      parkingSpaceApplicationCategoryTranslation[item.waitingListTypeCaption] ==
      ParkingSpaceApplicationCategory.internal
    ) {
      return item
    }
  }
  return undefined
}

export {
  getDetailedApplicantInformation,
  parseWaitingListForInternalParkingSpace,
}
