/* eslint-disable no-process-exit */
import {
  getExpiredListings,
  updateListingStatuses,
} from '../services/lease-service/adapters/listing-adapter'
import { ListingStatus } from 'onecore-types'

export async function updateExpiredListings(): Promise<number[]> {
  const expiredListings = await getExpiredListings()
  console.log('Expired listings: ', expiredListings)
  if (expiredListings.length > 0) {
    const expiredListingsIds = expiredListings.map((l) => l.Id)
    console.log(`Found ${expiredListingsIds} expired listings`)
    const updateCount = await updateListingStatuses(
      expiredListingsIds,
      ListingStatus.Expired
    )
    console.log(`Updated ${updateCount} expired listings`)
    return expiredListingsIds
  }
  console.log('Expired listings updated successfully')
  return []
}

//todo: introduce offered as status
//todo: introduce a status for "Förmedlad"

//Previously we assumed that Expired was enough as a status for Listings
//This would however create a very inefficient loop for the scheduled job
//With only Expired we need to fetch each offer every time for every Listing
//and then check the status of the offer to determine what to do (or if the offer even exists)
export async function createOffersForExpiredListings() {
  //get each expired listing E.G. as not yet been offered
  //create an offer for each expired listing
  //set listing status to Offered
}

export async function checkAndUpdateOfferedListings() {
  //get each offer for a offered listing
  //check if offer is still valid E.G. has not been accepted/declined
  //if offer has expired without reply, create a new offer
  //todo: below tasks are handled via user action
  //todo: EG only applicant/customer service can reply on an offer
  //If user replies NO to an offer, a new offer round should start
  //The listings status in that case should remain Offered
  //If user replies YES to an offer, the listings status should be set to "Förmedlad"
  //todo: handle if no more applicants exists
  //todo: the POST/offer endpoint is responsible to send a sensible message
  //todo: what is the status for an offer in that case?
}

//todo: run the actual functions in a separate file
//todo: process.exit messes up the tests
export async function run() {
  await updateExpiredListings()
  await createOffersForExpiredListings()
  await checkAndUpdateOfferedListings()
  //process.exit(0)
}

//run()
