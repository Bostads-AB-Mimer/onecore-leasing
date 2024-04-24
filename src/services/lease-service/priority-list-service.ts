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
import { getContactByContactCode, getLeasesForContactCode } from './adapters/xpand/tenant-lease-adapter'
import app from '../../app'

const getDetailedApplicantInformation = async (applicant: Applicant) => {
  try{
    const applicantFromXpand = await getContactByContactCode(applicant.contactCode, "false")
    console.log(applicantFromXpand)
    if(applicantFromXpand == undefined){
      console.log("applicant not found ")
      //todo: return error
      return
    }

    const applicantWaitingList = await getWaitingList(applicantFromXpand.nationalRegistrationNumber)
    const waitingListForInternalParkingSpace  = parseWaitingListForInternalParkingSpace(applicantWaitingList)
    console.log(waitingListForInternalParkingSpace)

    const leases = await getLeasesForContactCode(applicant.contactCode, "false", "false")
    console.log(leases)

    //todo: consolidate data into minimal viable object
    return {...applicantFromXpand, ...waitingListForInternalParkingSpace, ...leases}
  }catch (e){
    console.log(e)
  }

}

const parseWaitingListForInternalParkingSpace = (waitingList: WaitingList[]) : WaitingList | undefined => {
  for(const item of waitingList){
    if(parkingSpaceApplicationCategoryTranslation[item.waitingListTypeCaption]== ParkingSpaceApplicationCategory.internal){
      return item
    }
  }
  return undefined
}

export {
  getDetailedApplicantInformation,
  parseWaitingListForInternalParkingSpace
}