import assert from 'node:assert'

import { db, migrate, teardown } from '../adapters/db'
import * as service from '../sync-internal-parking-space-listings-from-xpand'
import * as xpandSoapAdapter from '../adapters/xpand/xpand-soap-adapter'
import * as factories from './factories'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await db('listing').del()
  jest.resetAllMocks()
})

afterAll(async () => {
  await teardown()
})

describe(service.syncInternalParkingSpaces, () => {
  it('inserts parking spaces as listings', async () => {
    const internalParkingSpaceMocks =
      factories.soapInternalParkingSpace.buildList(10)
    const soapSpy = jest
      .spyOn(xpandSoapAdapter, 'getPublishedInternalParkingSpaces')
      .mockResolvedValueOnce({
        ok: true,
        data: internalParkingSpaceMocks,
      })

    const result = await service.syncInternalParkingSpaces()

    expect(soapSpy).toHaveBeenCalledTimes(1)
    assert(result.ok)
    expect(result.data.failed).toHaveLength(0)
    expect(result.data.inserted).toHaveLength(internalParkingSpaceMocks.length)

    const insertedListings = (
      await db('listing').select('rentalObjectCode')
    ).map((v) => v.rentalObjectCode)

    expect(insertedListings).toEqual(
      internalParkingSpaceMocks.map((v) => v.RentalObjectCode)
    )
  })

  it('fails gracefully on duplicates and inserts the rest', async () => {
    const internalParkingSpaces = [
      factories.soapInternalParkingSpace.build({
        RentalObjectCode: '1',
      }),
      factories.soapInternalParkingSpace.build({
        RentalObjectCode: '2',
      }),
      factories.soapInternalParkingSpace.build({
        RentalObjectCode: '2',
      }),
    ]

    const soapSpy = jest
      .spyOn(xpandSoapAdapter, 'getPublishedInternalParkingSpaces')
      .mockResolvedValueOnce({
        ok: true,
        data: internalParkingSpaces,
      })

    const result = await service.syncInternalParkingSpaces()

    expect(soapSpy).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      ok: true,
      data: {
        failed: [
          expect.objectContaining({
            err: 'conflict-active-listing',
            listing: expect.objectContaining({ rentalObjectCode: '2' }),
          }),
        ],
        inserted: expect.arrayContaining([
          expect.objectContaining({ rentalObjectCode: '1' }),
          expect.objectContaining({ rentalObjectCode: '2' }),
        ]),
      },
    })

    const insertedListings = await db('listing').select('rentalObjectCode')

    expect(insertedListings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rentalObjectCode: '1' }),
        expect.objectContaining({ rentalObjectCode: '2' }),
      ])
    )
  })
})
