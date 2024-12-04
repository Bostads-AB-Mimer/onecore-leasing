import { ApplicationProfile, leasing } from 'onecore-types'
import { logger } from 'onecore-utilities'
import { Knex } from 'knex'
import { z } from 'zod'

import { AdapterResult } from './adapters/types'
import * as applicationProfileAdapter from './adapters/application-profile-adapter'
import * as applicationProfileHousingReferenceAdapter from './adapters/application-profile-housing-reference-adapter'

type Params = z.infer<
  typeof leasing.CreateOrUpdateApplicationProfileRequestParamsSchema
>

export async function updateOrCreateApplicationProfile(
  db: Knex,
  contactCode: string,
  params: Params
): Promise<
  AdapterResult<
    ApplicationProfile,
    | 'update-application-profile'
    | 'update-housing-reference'
    | 'create-application-profile'
    | 'create-housing-reference'
    | 'unknown'
  >
> {
  try {
    const res = await db.transaction(async (trx) => {
      const profile = await updateOrCreateProfile(trx, contactCode, params)

      if (!params.housingReference) {
        return profile
      }

      const housingReference = await updateOrCreateReference(trx, {
        ...params.housingReference,
        applicationProfileId: profile.id,
      })

      return { ...profile, housingReference }
    })

    return { ok: true, data: res }
  } catch (err) {
    logger.error(err, 'createOrUpdateApplicationProfile')

    if (err === 'update-application-profile') {
      return { ok: false, err: 'update-application-profile' }
    }

    if (err === 'update-housing-reference') {
      return { ok: false, err: 'update-housing-reference' }
    }

    if (err === 'create-application-profile') {
      return { ok: false, err: 'create-application-profile' }
    }

    if (err === 'create-housing-reference') {
      return { ok: false, err: 'create-housing-reference' }
    }

    return { ok: false, err: 'unknown' }
  }
}

async function updateOrCreateProfile(
  trx: Knex,
  contactCode: string,
  params: Params
) {
  const updateProfile = await applicationProfileAdapter.update(
    trx,
    contactCode,
    params
  )

  if (!updateProfile.ok) {
    if (updateProfile.err !== 'no-update') {
      throw 'update-application-profile'
    }

    const insertProfile = await applicationProfileAdapter.create(trx, {
      contactCode,
      ...params,
    })

    if (!insertProfile.ok) {
      throw 'create-application-profile'
    }

    return insertProfile.data
  }

  return updateProfile.data
}

async function updateOrCreateReference(
  trx: Knex,
  params: Params['housingReference'] & { applicationProfileId: number }
) {
  const updateReference =
    await applicationProfileHousingReferenceAdapter.update(
      trx,
      // TODO: Make sure we cant overwrite applicationProfileId
      params.applicationProfileId,
      params
    )

  if (!updateReference.ok) {
    if (updateReference.err !== 'no-update') {
      throw 'update-housing-reference'
    }

    const insertReference =
      await applicationProfileHousingReferenceAdapter.create(trx, params)

    if (!insertReference.ok) {
      throw 'create-housing-reference'
    }

    return insertReference.data
  }

  return updateReference.data
}
