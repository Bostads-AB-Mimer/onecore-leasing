import { Knex } from 'knex'
import { RequestError } from 'tedious'
import { logger } from 'onecore-utilities'
import {
  ApplicationProfile,
  ApplicationProfileHousingReference,
} from 'onecore-types'

import { AdapterResult } from './types'

type CreateParams = Pick<
  ApplicationProfile,
  | 'numChildren'
  | 'numAdults'
  | 'expiresAt'
  | 'housingType'
  | 'housingTypeDescription'
  | 'landlord'
> & { contactCode: string } & {
  housingReference: Pick<
    ApplicationProfileHousingReference,
    | 'expiresAt'
    | 'phone'
    | 'email'
    | 'reviewStatus'
    | 'comment'
    | 'reasonRejected'
    | 'lastAdminUpdatedAt'
    | 'lastApplicantUpdatedAt'
  >
}

export async function create(
  db: Knex,
  params: CreateParams
): Promise<
  AdapterResult<ApplicationProfile, 'conflict-contact-code' | 'unknown'>
> {
  try {
    const result = await db.transaction(async (trx) => {
      const [profile] = await trx
        .insert({
          contactCode: params.contactCode,
          numChildren: params.numChildren,
          numAdults: params.numAdults,
          expiresAt: params.expiresAt,
          housingType: params.housingType,
          housingTypeDescription: params.housingTypeDescription,
          landlord: params.landlord,
        })
        .into('application_profile')
        .returning('*')

      const [reference] = await trx
        .insert({
          applicationProfileId: profile.id,
          phone: params.housingReference.phone,
          email: params.housingReference.email,
          reviewStatus: params.housingReference.reviewStatus,
          comment: params.housingReference.comment,
          reasonRejected: params.housingReference.reasonRejected,
          lastAdminUpdatedAt: params.housingReference.lastAdminUpdatedAt,
          lastAdminUpdatedBy: 'not-implemented',
          lastApplicantUpdatedAt:
            params.housingReference.lastApplicantUpdatedAt,
          expiresAt: params.housingReference.expiresAt,
        })
        .into('application_profile_housing_reference')
        .returning('*')

      return { ...profile, housingReference: reference }
    })

    return { ok: true, data: result }
  } catch (err) {
    if (err instanceof RequestError) {
      if (err.message.includes('UQ_contactCode')) {
        logger.info(
          { contactCode: params.contactCode },
          'applicationProfileAdapter.create - can not insert duplicate application profile'
        )
        return { ok: false, err: 'conflict-contact-code' }
      }
    }

    logger.error(err, 'applicationProfileAdapter.create')
    return { ok: false, err: 'unknown' }
  }
}

export async function getByContactCode(
  db: Knex,
  contactCode: string
): Promise<AdapterResult<ApplicationProfile, 'not-found' | 'unknown'>> {
  try {
    const [row] = await db.raw(
      `
      SELECT 
        ap.*,
        (
          SELECT apht2.*
          FROM application_profile_housing_reference apht2
          WHERE apht2.applicationProfileId = ap.id
          FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES
        ) AS housingReference
      FROM application_profile ap
      INNER JOIN application_profile_housing_reference apht ON ap.id = apht.applicationProfileId
      WHERE ap.contactCode = ?
      `,
      [contactCode]
    )

    if (!row) {
      return { ok: false, err: 'not-found' }
    }

    const housingReference = JSON.parse(row.housingReference)

    return {
      ok: true,
      data: {
        ...row,
        housingType: row.housingType,
        housingTypeDescription: row.housingTypeDescription || null,
        landlord: row.landlord || null,
        housingReference: {
          ...housingReference,
          expiresAt: new Date(housingReference.expiresAt),
          createdAt: new Date(housingReference.createdAt),
          lastAdminUpdatedAt: housingReference.lastAdminUpdatedAt
            ? new Date(housingReference.lastAdminUpdatedAt)
            : null,
          lastApplicantUpdatedAt: housingReference.lastApplicantUpdatedAt
            ? new Date(housingReference.lastApplicantUpdatedAt)
            : null,
        },
      },
    }
  } catch (err) {
    logger.error(err, 'applicationProfileAdapter.getByContactCode')
    return { ok: false, err: 'unknown' }
  }
}

type UpdateParams = Pick<
  ApplicationProfile,
  | 'numChildren'
  | 'numAdults'
  | 'expiresAt'
  | 'housingType'
  | 'housingTypeDescription'
  | 'landlord'
> & {
  housingReference: Pick<
    ApplicationProfileHousingReference,
    | 'expiresAt'
    | 'phone'
    | 'email'
    | 'reviewStatus'
    | 'comment'
    | 'reasonRejected'
    | 'lastAdminUpdatedAt'
    | 'lastApplicantUpdatedAt'
  >
}

export async function update(
  db: Knex,
  contactCode: string,
  params: UpdateParams
): Promise<AdapterResult<ApplicationProfile, 'no-update' | 'unknown'>> {
  try {
    const result = await db.transaction(async (trx) => {
      const [profile] = await db('application_profile')
        .update({
          numChildren: params.numChildren,
          numAdults: params.numAdults,
          expiresAt: params.expiresAt,
          housingType: params.housingType,
          housingTypeDescription: params.housingTypeDescription,
          landlord: params.landlord,
        })
        .where('contactCode', contactCode)
        .returning('*')

      if (!profile) {
        return 'no-update'
      }

      const [reference] = await trx('application_profile_housing_reference')
        .update({
          phone: params.housingReference.phone,
          email: params.housingReference.email,
          reviewStatus: params.housingReference.reviewStatus,
          comment: params.housingReference.comment,
          reasonRejected: params.housingReference.reasonRejected,
          lastAdminUpdatedAt: params.housingReference.lastAdminUpdatedAt,
          lastAdminUpdatedBy: 'not-implemented',
          lastApplicantUpdatedAt:
            params.housingReference.lastApplicantUpdatedAt,
          expiresAt: params.housingReference.expiresAt,
        })
        .where({ applicationProfileId: profile.id })
        .returning('*')

      return { ...profile, housingReference: reference }
    })

    if (result === 'no-update') {
      return { ok: false, err: 'no-update' }
    }

    return { ok: true, data: result }
  } catch (err) {
    logger.error(err, 'applicationProfileAdapter.update')
    return { ok: false, err: 'unknown' }
  }
}
