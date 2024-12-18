import assert from 'node:assert'

import { db, migrate, teardown } from '../../adapters/db'
import * as applicationProfileAdapter from '../../adapters/application-profile-adapter'
import * as factory from '../factories'
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
    it('creates application profile', async () => {
      const profile = await applicationProfileAdapter.create(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: 'bar',
        landlord: 'baz',
        housingReference: factory.applicationProfileHousingReference.build(),
      })
      assert(profile.ok)

      const inserted = await applicationProfileAdapter.getByContactCode(
        db,
        '1234'
      )

      assert(inserted.ok)
      expect(inserted.data).toMatchObject(profile.data)
    })

    it('fails if existing profile for contact code already exists', async () => {
      const profile = await applicationProfileAdapter.create(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
        housingReference: factory.applicationProfileHousingReference.build(),
      })

      assert(profile.ok)

      const duplicate = await applicationProfileAdapter.create(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
        housingReference: factory.applicationProfileHousingReference.build(),
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
      const profile = await applicationProfileAdapter.create(db, '1234', {
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
        housingReference: factory.applicationProfileHousingReference.build(),
      })
      assert(profile.ok)

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

  describe(applicationProfileAdapter.update, () => {
    it('returns err if no update', async () => {
      const result = await applicationProfileAdapter.update(
        db,
        'contact-code',
        {
          expiresAt: new Date(),
          numAdults: 1,
          numChildren: 1,
          housingType: 'RENTAL',
          housingTypeDescription: null,
          landlord: null,
          housingReference: factory.applicationProfileHousingReference.build(),
        }
      )

      expect(result).toMatchObject({ ok: false, err: 'no-update' })
    })

    it('updates application profile', async () => {
      const profile = await applicationProfileAdapter.create(db, '1234', {
        expiresAt: null,
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
        housingReference: factory.applicationProfileHousingReference.build(),
      })

      assert(profile.ok)

      await applicationProfileAdapter.update(db, profile.data.contactCode, {
        expiresAt: new Date(),
        numAdults: 2,
        numChildren: 2,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
        housingReference: factory.applicationProfileHousingReference.build(),
      })

      const updated = await db('application_profile')
        .select('*')
        .where({ id: profile.data.id })
        .first()

      expect(updated).toMatchObject({
        id: expect.any(Number),
        contactCode: '1234',
        numAdults: 2,
        numChildren: 2,
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
      })
    })
  })
})
