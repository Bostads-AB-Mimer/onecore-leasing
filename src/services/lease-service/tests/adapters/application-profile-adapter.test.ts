import assert from 'node:assert'

import { db, migrate, teardown } from '../../adapters/db'
import * as applicationProfileAdapter from '../../adapters/application-profile-adapter'

beforeAll(async () => {
  await migrate()
})

afterEach(async () => {
  await db('offer_applicant').del()
  await db('offer').del()
  await db('applicant').del()
  await db('listing').del()
  await db('application_profile').del()
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
})
