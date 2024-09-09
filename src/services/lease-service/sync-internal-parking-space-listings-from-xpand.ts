import { Listing, ListingStatus } from 'onecore-types'
import { z } from 'zod'

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
  invalid: ParseInternalParkingSpacesToInsertableListingsResult['invalid']
  insertions: {
    inserted: Array<Listing>
    failed: Array<{
      listing: CreateListingData
      err: CreateListingErrors
    }>
  }
}

const ValidInternalParkingSpace = z.object({
  RentalObjectCode: z.string(),
  Address1: z.string(),
  MonthRent: z.number(),
  PublishedFrom: z.coerce.date(),
  PublishedTo: z.coerce.date(),
  VacantFrom: z.coerce.date(),
  WaitingListType: z.literal('Bilplats (intern)'),
  DistrictCaption: z.string().nullish(),
  DistrictCode: z.string().nullish(),
  BlockCaption: z.string().nullish(),
  BlockCode: z.string().nullish(),
  ObjectTypeCaption: z.string().nullish(),
  ObjectTypeCode: z.string().nullish(),
  RentalObjectTypeCaption: z.string().nullish(),
  RentalObjectTypeCode: z.string().nullish(),
})

/*
 * This service gets all published parking spaces from Xpand SOAP API
 * Then it processes the data in the following way:
 * - Keep only parking spaces that have WaitingListType Bilplats (intern)
 * - Parse all internal parking spaces using the Zod schema
 *   ValidInternalParkingSpace. Return an object with two properties:
 *   'ok'      -> a list of parking spaces mapped to listings, ready to be inserted
 *   'invalid' -> a list of { rentalObjectCode: string, err } where err is an
 *   array of errors associated with this internal parking space.
 *
 *   We do this because there is at least one known issue, where internal
 *   parking spaces are missing "PublishedTo", which is non-compatible with our
 *   current database. So we basically return which one failed and why.
 *
 * - Then we take all the 'valid' parking spaces and try to insert them.
 *   The ones who succeeded goes into an insertions.inserted array and the ones
 *   who failed goes into an insertions.failed array.
 */
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

  const parseInternalParkingSpacesResult =
    parseInternalParkingSpacesToInsertableListings(internalParkingSpaces)

  const insertions = await Promise.all(
    parseInternalParkingSpacesResult.ok.map(async (listing) => ({
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
    data: {
      invalid: parseInternalParkingSpacesResult.invalid,
      insertions: aggregatedInsertions,
    },
  }
}

function aggregateInsertions(
  result: ServiceSuccessData['insertions'],
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

type ParseInternalParkingSpacesToInsertableListingsResult = {
  ok: Array<CreateListingData>
  invalid: Array<{
    rentalObjectCode: string
    err: Array<{ path: string; code: string }>
  }>
}

export function parseInternalParkingSpacesToInsertableListings(
  parkingspaces: Array<any>
): ParseInternalParkingSpacesToInsertableListingsResult {
  return parkingspaces.reduce<ParseInternalParkingSpacesToInsertableListingsResult>(
    (acc, curr) => {
      const parseResult = ValidInternalParkingSpace.safeParse(curr)
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map((e) => {
          return { path: String(e.path[0]), code: e.code }
        })

        return {
          ...acc,
          invalid: acc.invalid.concat({
            rentalObjectCode: curr.RentalObjectCode,
            err: errors,
          }),
        }
      }

      return {
        ...acc,
        ok: acc.ok.concat(toInternalParkingSpaceListingsData(parseResult.data)),
      }
    },
    { ok: [], invalid: [] }
  )
}

export function toInternalParkingSpaceListingsData(
  item: z.infer<typeof ValidInternalParkingSpace>
): CreateListingData {
  return {
    rentalObjectCode: item.RentalObjectCode,
    address: item.Address1,
    monthlyRent: item.MonthRent,
    objectTypeCaption: item.ObjectTypeCaption ?? undefined,
    objectTypeCode: item.ObjectTypeCode ?? undefined,
    rentalObjectTypeCaption: item.RentalObjectTypeCaption ?? undefined,
    rentalObjectTypeCode: item.RentalObjectTypeCode ?? undefined,
    publishedFrom: new Date(item.PublishedFrom),
    publishedTo: new Date(item.PublishedTo),
    vacantFrom: new Date(item.VacantFrom),
    status: ListingStatus.Active,
    waitingListType: item.WaitingListType,
  }
}
