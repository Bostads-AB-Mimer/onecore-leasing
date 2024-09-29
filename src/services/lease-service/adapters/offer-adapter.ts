import {
  OfferWithRentalObjectCode,
  Offer,
  Applicant,
  DetailedOffer,
  OfferStatus,
  ApplicantStatus,
  LeaseStatus,
} from 'onecore-types'
import { logger } from 'onecore-utilities'
import { Knex } from 'knex'

import { db } from './db'
import { AdapterResult, DbApplicant, DbDetailedOffer, DbOffer } from './types'

import * as dbUtils from './utils'

type OfferApplicant = {
  id: number
  listingId: number
  offerId: number
  applicantId: number
  applicantStatus: ApplicantStatus
  applicantApplicationType: 'Replace' | 'Additional'
  applicantQueuePoints: number
  applicantAddress: string
  applicantHasParkingSpace: boolean
  applicantHousingLeaseStatus: LeaseStatus
  applicantPriority: number | null
  sortOrder: number
  createdAt: Date
}

type CreateOfferApplicantParams = Omit<OfferApplicant, 'id' | 'createdAt'>

type CreateOfferParams = Omit<
  Offer,
  'id' | 'sentAt' | 'answeredAt' | 'offeredApplicant' | 'createdAt'
> & { applicantId: number }

export async function create(
  db: Knex,
  params: CreateOfferParams
): Promise<AdapterResult<Offer, 'no-applicant' | 'unknown'>> {
  const { selectedApplicants, ...rest } = params
  const values = {
    ...rest,
    selectionSnapshot: JSON.stringify(selectedApplicants),
  }

  try {
    const applicant = await db<DbApplicant>('applicant')
      .select('*')
      .where('Id', params.applicantId)
      .first()

    if (!applicant) {
      logger.error(
        { applicantId: params.applicantId, listingId: params.listingId },
        'Applicant not found when creating offer'
      )
      return { ok: false, err: 'no-applicant' }
    }

    const offer = await db.transaction(async (trx) => {
      const [offer] = await trx<DbOffer>('offer')
        .insert(dbUtils.camelToPascal(values))
        .returning('*')

      const insertableOfferApplicants = params.selectedApplicants.map(
        (a, i): CreateOfferApplicantParams => ({
          applicantId: a.id,
          applicantStatus: a.status,
          listingId: params.listingId,
          offerId: offer.Id,
          applicantApplicationType: a.applicationType || ('Additional' as any),
          applicantPriority: a.priority ?? null,
          applicantQueuePoints: a.queuePoints,
          sortOrder: i + 1,
          applicantAddress: a.address
            ? `${a.address.street} ${a.address.number}`
            : '', // TODO: Needs address
          applicantHasParkingSpace: true,
          applicantHousingLeaseStatus: 1,
        })
      )

      await trx<OfferApplicant>('offer_applicant').insert(
        insertableOfferApplicants
      )

      return offer
    })

    return { ok: true, data: transformToOfferFromDbOffer(offer, applicant) }
  } catch (err) {
    logger.error(err, 'Error creating offer')
    return { ok: false, err: 'unknown' }
  }
}

type GetOffersForContactQueryResult = Array<
  DbOffer & {
    RentalObjectCode: string
    ApplicantApplicantId: number
    ApplicantName: string
    ApplicantNationalRegistrationNumber: string
    ApplicantContactCode: string
    ApplicantApplicationDate: Date
    ApplicantApplicationType: string | null
    ApplicantStatus: Applicant['status']
    ApplicantListingId: number
  }
>

export async function getOffersForContact(
  contactCode: string
): Promise<Array<OfferWithRentalObjectCode>> {
  const rows = await db
    .select<GetOffersForContactQueryResult>(
      'offer.*',
      'listing.RentalObjectCode',
      'applicant.Id as ApplicantApplicantId',
      'applicant.Name as ApplicantName',
      'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
      'applicant.ContactCode as ApplicantContactCode',
      'applicant.ApplicationDate as ApplicantApplicationDate',
      'applicant.ApplicationType as ApplicantApplicationType',
      'applicant.Status as ApplicantStatus',
      'applicant.ListingId as ApplicantListingId'
    )
    .from('offer')
    .innerJoin('listing', 'listing.Id', 'offer.ListingId')
    .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
    .where('applicant.ContactCode', contactCode)

  return rows.map((row) => {
    const {
      ApplicantApplicantId,
      ApplicantName,
      ApplicantNationalRegistrationNumber,
      ApplicantApplicationDate,
      ApplicantApplicationType,
      ApplicantContactCode,
      ApplicantStatus,
      ApplicantListingId,
      RentalObjectCode,
      ...offer
    } = row

    return {
      ...transformToOfferFromDbOffer(offer, {
        ApplicationDate: ApplicantApplicationDate,
        ContactCode: ApplicantContactCode,
        Id: ApplicantApplicantId,
        ListingId: ApplicantListingId,
        Name: ApplicantName,
        NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
        Status: ApplicantStatus,
        ApplicationType: ApplicantApplicationType,
      }),
      rentalObjectCode: RentalObjectCode,
    }
  })
}

export async function getOfferByContactCodeAndOfferId(
  contactCode: string,
  offerId: number
): Promise<DetailedOffer | undefined> {
  const row = await db
    .select(
      'offer.Id',
      'offer.SentAt',
      'offer.ExpiresAt',
      'offer.AnsweredAt',
      'offer.Status',
      'offer.ListingId',
      'offer.ApplicantId',
      'offer.CreatedAt',
      'listing.RentalObjectCode',
      'listing.VacantFrom',
      'applicant.Id as ApplicantApplicantId',
      'applicant.Name as ApplicantName',
      'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
      'applicant.ContactCode as ApplicantContactCode',
      'applicant.ApplicationDate as ApplicantApplicationDate',
      'applicant.ApplicationType as ApplicantApplicationType',
      'applicant.Status as ApplicantStatus',
      'applicant.ListingId as ApplicantListingId'
    )
    .from('offer')
    .innerJoin('listing', 'listing.Id', 'offer.ListingId')
    .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
    .where('offer.Id', offerId)
    .andWhere('applicant.ContactCode', contactCode)
    .first()

  if (row == undefined) {
    logger.info(
      { offerId },
      'Getting offer from leasing DB complete - offer not found'
    )
    return undefined
  }
  const {
    ApplicantApplicantId,
    ApplicantName,
    ApplicantNationalRegistrationNumber,
    ApplicantApplicationDate,
    ApplicantApplicationType,
    ApplicantContactCode,
    ApplicantStatus,
    ApplicantListingId,
    RentalObjectCode,
    VacantFrom,
    ...offer
  } = row

  return {
    ...transformToDetailedOfferFromDbOffer(offer, {
      ApplicationDate: ApplicantApplicationDate,
      ContactCode: ApplicantContactCode,
      Id: ApplicantApplicantId,
      ListingId: ApplicantListingId,
      Name: ApplicantName,
      NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
      Status: ApplicantStatus,
      ApplicationType: ApplicantApplicationType,
    }),
    rentalObjectCode: RentalObjectCode,
    vacantFrom: VacantFrom,
  }
}

export async function getOfferByOfferId(
  offerId: number
): Promise<AdapterResult<DetailedOffer, 'not-found' | 'unknown'>> {
  try {
    const row = await db
      .select(
        'offer.Id',
        'offer.SentAt',
        'offer.ExpiresAt',
        'offer.AnsweredAt',
        'offer.Status',
        'offer.ListingId',
        'offer.ApplicantId',
        'offer.CreatedAt',
        'listing.RentalObjectCode',
        'listing.VacantFrom',
        'applicant.Id as ApplicantApplicantId',
        'applicant.Name as ApplicantName',
        'applicant.NationalRegistrationNumber as ApplicantNationalRegistrationNumber',
        'applicant.ContactCode as ApplicantContactCode',
        'applicant.ApplicationDate as ApplicantApplicationDate',
        'applicant.ApplicationType as ApplicantApplicationType',
        'applicant.Status as ApplicantStatus',
        'applicant.ListingId as ApplicantListingId'
      )
      .from('offer')
      .innerJoin('listing', 'listing.Id', 'offer.ListingId')
      .innerJoin('applicant', 'applicant.Id', 'offer.ApplicantId')
      .where('offer.Id', offerId)
      .first()

    if (row == undefined) {
      logger.info(
        { offerId },
        'Getting offer from leasing DB complete - offer not found'
      )
      return { ok: false, err: 'not-found' }
    }
    const {
      ApplicantApplicantId,
      ApplicantName,
      ApplicantNationalRegistrationNumber,
      ApplicantApplicationDate,
      ApplicantApplicationType,
      ApplicantContactCode,
      ApplicantStatus,
      ApplicantListingId,
      RentalObjectCode,
      VacantFrom,
      ...offer
    } = row

    return {
      ok: true,
      data: {
        ...transformToDetailedOfferFromDbOffer(offer, {
          ApplicationDate: ApplicantApplicationDate,
          ContactCode: ApplicantContactCode,
          Id: ApplicantApplicantId,
          ListingId: ApplicantListingId,
          Name: ApplicantName,
          NationalRegistrationNumber: ApplicantNationalRegistrationNumber,
          Status: ApplicantStatus,
          ApplicationType: ApplicantApplicationType,
        }),
        rentalObjectCode: RentalObjectCode,
        vacantFrom: VacantFrom,
      },
    }
  } catch (error) {
    logger.error(error, 'Error getting waiting list using Xpand SOAP API')
    return { ok: false, err: 'unknown' }
  }
}

export async function updateOfferStatus(
  params: {
    offerId: number
    status: OfferStatus
  },
  // TODO: What to put as type parameters to knex?
  dbConnection: Knex = db
): Promise<AdapterResult<null, 'no-update' | 'unknown'>> {
  try {
    // TODO: OfferStatus is stored as a string in the db. I think it should be
    // an integer to correspond to our enum.
    const query = await dbConnection('offer')
      .update({ Status: params.status })
      .where({ Id: params.offerId })

    if (!query) {
      return { ok: false, err: 'no-update' }
    }
    return { ok: true, data: null }
  } catch (_err) {
    return { ok: false, err: 'unknown' }
  }
}

export async function getOffersByListingId(
  listingId: number,
  dbConnection: Knex = db
): Promise<AdapterResult<Array<Offer>, 'unknown'>> {
  try {
    const rows = await dbConnection.raw<Array<any>>(`
      SELECT 
      offer.Id,
      offer.SentAt,
      offer.ExpiresAt,
      offer.AnsweredAt,
      offer.Status,
      offer.ListingId,
      offer.ApplicantId,
      offer.CreatedAt,
      (
        SELECT * FROM applicant
        WHERE applicant.Id = offer.ApplicantId
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
      ) as offeredApplicant,
      (
        SELECT * FROM offer_applicant
        WHERE offer_applicant.offerId = offer.Id
        ORDER BY sortOrder ASC
        FOR JSON PATH
      ) as selectionSnapshot
      FROM offer
      INNER JOIN applicant ON (offer.ApplicantId = applicant.Id)
      INNER JOIN offer_applicant ON (offer_applicant.offerId = offer.Id)
      WHERE offer.ListingId = ${listingId}
    `)

    const mappedRows = rows
      .map((row) => ({
        ...row,
        offeredApplicant: JSON.parse(row.offeredApplicant),
      }))
      .map((row) => transformToOfferFromDbOffer(row, row.offeredApplicant))

    return {
      ok: true,
      data: mappedRows,
    }
  } catch (err) {
    logger.error(err, 'Error getting offers by listing ID')
    return { ok: false, err: 'unknown' }
  }
}

const transformToDetailedOfferFromDbOffer = (
  o: DbDetailedOffer,
  a: DbApplicant
): DetailedOffer => {
  const { applicantId: _applicantId, ...offer } = dbUtils.pascalToCamel(o)
  return {
    ...offer,
    offeredApplicant: {
      ...dbUtils.pascalToCamel(a),
      applicationType: a.ApplicationType || undefined,
    },
  }
}

const transformToOfferFromDbOffer = (o: DbOffer, a: DbApplicant): Offer => {
  const {
    selectionSnapshot: selectedApplicants,
    applicantId: _applicantId,
    ...offer
  } = dbUtils.pascalToCamel(o)

  return {
    ...offer,
    selectedApplicants: JSON.parse(selectedApplicants),
    offeredApplicant: {
      ...dbUtils.pascalToCamel(a),
      applicationType: a.ApplicationType || undefined,
    },
  }
}
