import { Listing, ListingStatus } from 'onecore-types'

import * as xpandSoapAdapter from './adapters/xpand/xpand-soap-adapter'
import * as listingAdapter from './adapters/listing-adapter'
import { AdapterResult } from './adapters/types'

type CreateListingData = Omit<Listing, 'id'>
type ServiceError = 'get-parking-spaces' | 'unknown'

type CreateListingErrors = Extract<
  Awaited<ReturnType<typeof listingAdapter.createListing>>,
  { ok: false }
>['err']

type ServiceSuccessData = {
  inserted: Array<Listing>
  failed: Array<{
    listing: CreateListingData
    err: CreateListingErrors
  }>
}

export async function syncInternalParkingSpaces(): Promise<
  AdapterResult<ServiceSuccessData, ServiceError>
> {
  const result = await xpandSoapAdapter.getPublishedInternalParkingSpaces()

  if (!result.ok) {
    return { ok: false, err: 'get-parking-spaces' }
  }

  const internalParkingSpaces = result.data.filter(
    (v: { WaitingListType: string }) =>
      v.WaitingListType === 'Bilplats (intern)'
  )

  const listingsData = internalParkingSpaces.map(
    toInternalParkingSpaceListingsData
  )

  const insertions = await Promise.all(
    listingsData.map(async (listing) => ({
      listing,
      insertionResult: await listingAdapter.createListing(listing),
    }))
  )

  const aggregatedInsertions = insertions.reduce(aggregateInsertions, {
    inserted: [],
    failed: [],
  })

  return {
    ok: true,
    data: aggregatedInsertions,
  }
}

function aggregateInsertions(
  result: ServiceSuccessData,
  data: {
    listing: CreateListingData
    insertionResult: Awaited<ReturnType<typeof listingAdapter.createListing>>
  }
) {
  if (!data.insertionResult.ok) {
    return {
      ...result,
      failed: result.failed.concat({
        listing: data.listing,
        err: data.insertionResult.err,
      }),
    }
  } else {
    return {
      ...result,
      inserted: result.inserted.concat(data.insertionResult.data),
    }
  }
}

function toInternalParkingSpaceListingsData(item: any): CreateListingData {
  return {
    rentalObjectCode: item.RentalObjectCode,
    address: item.Address1,
    monthlyRent: item.MonthRent,
    objectTypeCaption: item.ObjectTypeCaption,
    objectTypeCode: item.ObjectTypeCode,
    rentalObjectTypeCaption: item.RentalObjectTypeCaption,
    rentalObjectTypeCode: item.RentalObjectTypeCode,
    publishedFrom: new Date(item.PublishedFrom),
    publishedTo: new Date(item.PublishedTo),
    vacantFrom: new Date(item.VacantFrom),
    // TODO: Can we trust status should be active?
    status: ListingStatus.Active,
    waitingListType: 'Bilplats (intern)',
  }
}
