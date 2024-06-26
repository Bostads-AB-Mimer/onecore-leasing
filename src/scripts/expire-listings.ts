/* eslint-disable no-process-exit */
import { getExpiredListings, updateListingStatuses } from '../services/lease-service/adapters/listing-adapter'
import { ListingStatus } from 'onecore-types'

async function updateExpiredListings() {
    const expiredListings = await getExpiredListings();
    console.log('Expired listings: ', expiredListings);
    if (expiredListings.length > 0) {
        const expiredListingsIds = expiredListings.map(l => l.Id);
        console.log(`Found ${expiredListingsIds} expired listings`);
        const updateCount = await updateListingStatuses(expiredListingsIds, ListingStatus.Expired);
        console.log(`Updated ${updateCount} expired listings`);
    }
    console.log('Expired listings updated successfully')
    process.exit(0);
}

updateExpiredListings();
