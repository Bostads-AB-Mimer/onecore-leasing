import assert from 'node:assert'

import { db, migrate, teardown } from '../../adapters/db'
import * as applicationProfileAdapter from '../../adapters/application-profile-adapter'
import { clearDb } from '../testUtils'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await clearDb(db)
})

afterAll(async () => {
  await teardown()
})

describe('application-profile-adapter', () => {
  describe(applicationProfileAdapter.create, () => {
    it('inserts application profile', async () => {
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
      })
      assert(profile.ok)

      const inserted = await applicationProfileAdapter.getByContactCode(
        db,
        profile.data.contactCode
      )

      assert(inserted.ok)
      expect(inserted).toMatchObject({ ok: true, data: profile.data })
    })

    it('fails if existing profile for contact code already exists', async () => {
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
      })

      assert(profile.ok)

      const duplicate = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
      })

      expect(duplicate).toMatchObject({
        ok: false,
        err: 'conflict-contact-code',
      })
    })
  })

  describe(applicationProfileAdapter.getByContactCode, () => {
    it('returns err if not found', async () => {
      const result = await applicationProfileAdapter.getByContactCode(
        db,
        '1234'
      )
      expect(result).toMatchObject({ ok: false, err: 'not-found' })
    })

    it('gets application profile', async () => {
      await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
      })

      const result = await applicationProfileAdapter.getByContactCode(
        db,
        '1234'
      )

      expect(result).toMatchObject({
        ok: true,
        data: {
          id: expect.any(Number),
          contactCode: '1234',
          numAdults: 1,
          numChildren: 1,
          expiresAt: expect.any(Date),
          createdAt: expect.any(Date),
        },
      })
    })
  })
})