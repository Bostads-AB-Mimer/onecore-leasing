import assert from 'node:assert'

import { migrate, db, teardown } from '../adapters/db'
import { updateOrCreateApplicationProfile } from '../update-or-create-application-profile'
import * as applicationProfileAdapter from '../adapters/application-profile-adapter'
import { clearDb } from './testUtils'

beforeAll(async () => {
  await migrate()
})

beforeEach(async () => {
  await clearDb(db)
})

afterAll(async () => {
  await teardown()
})

describe(updateOrCreateApplicationProfile.name, () => {
  describe('when no profile exists and housing reference is not passed', () => {
    it('creates application profile and housing reference', async () => {
      const res = await updateOrCreateApplicationProfile(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'foo',
        landlord: 'baz',
        housingTypeDescription: 'qux',
      })

      expect(res).toMatchObject({ ok: true })
      const inserted = await applicationProfileAdapter.getByContactCode(
        db,
        '1234'
      )
      assert(inserted.ok)
      expect(inserted).toMatchObject({
        ok: true,
        data: expect.objectContaining({ contactCode: '1234' }),
      })
    })
  })

  describe('when no profile exists and housing reference is passed', () => {
    it('creates application profile and housing reference', async () => {
      const res = await updateOrCreateApplicationProfile(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'foo',
        landlord: 'baz',
        housingTypeDescription: 'qux',
        housingReference: {
          email: 'email',
          name: 'name',
          phone: 'phone',
          reviewStatus: 'status',
          reviewedAt: new Date(),
          expiresAt: new Date(),
          reviewStatusReason: 'reason',
        },
      })

      expect(res).toMatchObject({
        ok: true,
      })
    })
  })
})
