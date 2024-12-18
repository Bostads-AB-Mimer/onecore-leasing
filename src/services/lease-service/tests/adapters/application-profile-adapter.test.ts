import assert from 'node:assert'

import { db, migrate, teardown } from '../../adapters/db'
import * as applicationProfileAdapter from '../../adapters/application-profile-adapter'
import * as housingReferenceAdapter from '../../adapters/application-profile-housing-reference-adapter'
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
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: 'bar',
        landlord: 'baz',
      })
      assert(profile.ok)

      const inserted = await db('application_profile')
        .select('*')
        .where({ id: profile.data.id })
        .first()

      expect(inserted).toMatchObject(profile.data)
    })

    it('fails if existing profile for contact code already exists', async () => {
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
      })

      assert(profile.ok)

      const duplicate = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
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
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: new Date(),
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
      })
      assert(profile.ok)

      const reference = await housingReferenceAdapter.create(db, {
        applicationProfileId: profile.data.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })
      assert(reference.ok)

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
        }
      )

      expect(result).toMatchObject({ ok: false, err: 'no-update' })
    })

    it('updates application profile', async () => {
      const profile = await applicationProfileAdapter.create(db, {
        contactCode: '1234',
        expiresAt: null,
        numAdults: 1,
        numChildren: 1,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
      })

      assert(profile.ok)

      await housingReferenceAdapter.create(
        db,
        factory.applicationProfileHousingReference.build({
          applicationProfileId: profile.data.id,
        })
      )

      await applicationProfileAdapter.update(db, profile.data.contactCode, {
        expiresAt: new Date(),
        numAdults: 2,
        numChildren: 2,
        housingType: 'RENTAL',
        housingTypeDescription: null,
        landlord: null,
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
