import { Knex } from 'knex'
import z from 'zod'
import { AdapterResult } from './types'
import { logger } from 'onecore-utilities'
import { RequestError } from 'tedious'

export const ApplicationProfileSchema = z.object({
  id: z.number(),
  contactCode: z.string(),
  numAdults: z.number(),
  numChildren: z.number(),
  expiresAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
})

type ApplicationProfile = z.infer<typeof ApplicationProfileSchema>

type CreateParams = {
  contactCode: string
  numAdults: number
  numChildren: number
  expiresAt: Date | null
}

export async function create(
  db: Knex,
  params: CreateParams
): Promise<
  AdapterResult<ApplicationProfile, 'conflict-contact-code' | 'unknown'>
> {
  try {
    const [profile] = await db
      .insert(params)
      .into('application_profile')
      .returning('*')

    return { ok: true, data: profile }
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
    const [profile] = await db
      .select('*')
      .from('application_profile')
      .where('contactCode', contactCode)
      .returning('*')

    if (!profile) {
      return { ok: false, err: 'not-found' }
    }

    return { ok: true, data: profile }
  } catch (err) {
    logger.error(err, 'applicationProfileAdapter.getByContactCode')
    return { ok: false, err: 'unknown' }
  }
}
