import assert from 'node:assert'
import { Knex } from 'knex'

import * as adapter from '../../adapters/application-profile-housing-reference-adapter'
import * as applicationProfileAdapter from '../../adapters/application-profile-adapter'
import { withContext } from '../testUtils'

async function createApplicationProfile(db: Knex) {
  const profile = await applicationProfileAdapter.create(db, {
    contactCode: '1234',
    expiresAt: new Date(),
    numAdults: 1,
    numChildren: 1,
    housingType: null,
    housingTypeDescription: null,
    landlord: null,
  })

  assert(profile.ok)
  return profile.data
}

describe('application-profile-housing-reference-adapter', () => {
  describe(adapter.create, () => {
    it('inserts application profile housing reference', async () => {
      const applicationProfile = await createApplicationProfile()
      const reference = await adapter.create(db, {
        applicationProfileId: applicationProfile.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'not-implemented',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      assert(reference.ok)

      const inserted = await adapter.findByApplicationProfileId(
        db,
        applicationProfile.id
      )

      assert(inserted.ok)

      expect(inserted.data).toEqual({
        id: expect.any(Number),
        applicationProfileId: applicationProfile.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: expect.any(Date),
        createdAt: expect.any(Date),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'not-implemented',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })
    })

    it('rejects duplicate application profile id', async () => {
      const applicationProfile = await createApplicationProfile()
      const reference = await adapter.create(db, {
        applicationProfileId: applicationProfile.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),

        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'foo',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      const duplicateReference = await adapter.create(db, {
        applicationProfileId: applicationProfile.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'foo',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      assert(reference.ok)
      expect(duplicateReference).toEqual({
        ok: false,
        err: 'conflict-application-profile-id',
      })
    })
  })

  describe(adapter.update, () => {
    it('returns err if no update', async () => {
      const result = await adapter.update(db, 1, {
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'foo',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      expect(result).toMatchObject({ ok: false, err: 'no-update' })
    })

    it('updates application profile', async () => {
      const profile = await createApplicationProfile()

      await adapter.create(db, {
        applicationProfileId: profile.id,
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'foo',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      await adapter.update(db, profile.id, {
        email: null,
        phone: '01234',
        reviewStatus: 'PENDING',
        expiresAt: new Date(),
        comment: null,
        lastAdminUpdatedAt: null,
        lastAdminUpdatedBy: 'foo',
        lastApplicantUpdatedAt: null,
        reasonRejected: null,
      })

      const updated = await adapter.findByApplicationProfileId(db, profile.id)

      assert(updated.ok)
      expect(updated.data).toMatchObject({
        applicationProfileId: profile.id,
        reviewStatus: 'PENDING',
      })
    })
  })
})
