import {
  ApplicationProfile,
  ApplicationProfileHousingReference,
  leasing,
} from 'onecore-types'
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
    [ApplicationProfile, 'created' | 'updated'],
    | 'update-application-profile'
    | 'update-housing-reference'
    | 'create-application-profile'
    | 'create-housing-reference'
    | 'unknown'
  >
> {
  try {
    const result = await db.transaction<
      [ApplicationProfile, 'created' | 'updated']
    >(async (trx) => {
      const [profile, operation] = await updateOrCreateProfile(
        trx,
        contactCode,
        params
      )

      if (!params.housingReference) {
        return [profile, operation] as const
      }

      const [housingReference] = await updateOrCreateReference(trx, {
        ...params.housingReference,
        applicationProfileId: profile.id,
      })

      return [{ ...profile, housingReference }, operation] as const
    })

    return { ok: true, data: result }
  } catch (err) {
    logger.error(err, 'updateOrCreateApplicationProfile')

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
): Promise<[ApplicationProfile, 'created' | 'updated']> {
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

    return [insertProfile.data, 'created']
  }

  return [updateProfile.data, 'updated']
}

async function updateOrCreateReference(
  trx: Knex,
  params: Params['housingReference'] & { applicationProfileId: number }
): Promise<[ApplicationProfileHousingReference, 'created' | 'updated']> {
  const updateReference =
    await applicationProfileHousingReferenceAdapter.update(
      trx,
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

    return [insertReference.data, 'created']
  }

  return [updateReference.data, 'updated']
}
