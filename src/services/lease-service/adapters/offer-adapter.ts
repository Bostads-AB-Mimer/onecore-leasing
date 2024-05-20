import { Offer } from 'onecore-types'
import { db } from './db'
import { DbApplicant, DbOffer } from './types'

import * as dbUtils from './utils'

type CreateOfferParams = Omit<
  Offer,
  'id' | 'sentAt' | 'answeredAt' | 'offeredApplicant'
> & { applicantId: number }

export async function create(params: CreateOfferParams) {
  const { selectedApplicants, ...rest } = params
  const values = {
    ...rest,
    selectionSnapshot: JSON.stringify(selectedApplicants),
  }

  const [offer, applicant] = await db.transaction(async (trx) => {
    const offer = await trx<DbOffer>('offer')
      .insert(dbUtils.camelToPascal(values))
      .returning('*')
      .first()

    if (!offer) {
      throw new Error('Unexpected missing offer')
    }

    const applicant = await trx<DbApplicant>('applicant')
      .select('*')
      .where('Id', offer.Id)
      .first()

    if (!applicant) {
      throw new Error('Unexpected missing applicant')
    }

    return [offer, applicant]
  })

  return transformFromDbOffer(offer, applicant)
}

const transformFromDbOffer = (o: DbOffer, a: DbApplicant): Offer => {
  const {
    selectionSnapshot: selectedApplicants,
    applicantId: _applicantId,
    ...offer
  } = dbUtils.pascalToCamel(o)

  return {
    ...offer,
    selectedApplicants: JSON.parse(selectedApplicants),
    offeredApplicant: dbUtils.pascalToCamel(a),
  }
}
