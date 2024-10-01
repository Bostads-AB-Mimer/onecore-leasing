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

export type DbOfferApplicant = {
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

export type OfferApplicant = {
  id: number
  listingId: number
  offerId: number
  applicantId: number
  status: ApplicantStatus
  applicationType: 'Replace' | 'Additional'
  queuePoints: number
  address: string
  hasParkingSpace: boolean
  housingLeaseStatus: LeaseStatus
  applicationDate: Date
  priority: number | null
  sortOrder: number
  createdAt: Date
}

type CreateOfferApplicantParams = Omit<DbOfferApplicant, 'id' | 'createdAt'>

type CreateOfferParams = {
  status: OfferStatus
  expiresAt: Date
  listingId: number
  applicantId: number
  offerApplicants: Array<CreateOfferApplicantParams>
}

//todo: will replace current offer
type NewOffer = Omit<Offer, 'selectedApplicants'> & {
  selectedApplicants: Array<OfferApplicant>
}

export async function create(
  db: Knex,
  params: CreateOfferParams
): Promise<
  AdapterResult<NewOffer, 'no-applicant' | 'no-offer-applicants' | 'unknown'>
> {
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

    if (!params.offerApplicants.length) {
      return { ok: false, err: 'no-offer-applicants' }
    }

    const offer = await db.transaction(async (trx) => {
      const { offerApplicants, ...offerParams } = params
      const [offer] = await trx.raw<Array<DbOffer>>(
        `INSERT INTO offer (
          Status,
          ExpiresAt,
          ListingId,
          ApplicantId,
          SelectionSnapshot
        ) OUTPUT INSERTED.*
        VALUES (?, ?, ?, ?, ?) 
        `,
        [
          offerParams.status,
          offerParams.expiresAt,
          offerParams.listingId,
          offerParams.applicantId,
          '[]',
        ]
      )

      const offerApplicantsValues = offerApplicants.map((offerApplicant) => [
        offer.Id,
        params.listingId,
        offerApplicant.applicantId,
        offerApplicant.applicantStatus,
        offerApplicant.applicantApplicationType,
        offerApplicant.applicantQueuePoints,
        offerApplicant.applicantAddress,
        offerApplicant.applicantHasParkingSpace,
        offerApplicant.applicantHousingLeaseStatus,
        offerApplicant.applicantPriority,
        offerApplicant.sortOrder,
      ])

      const placeholders = offerApplicants
        .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .join(', ')

      await trx.raw(
        `INSERT INTO offer_applicant (
          offerId,
          listingId,
          applicantId,
          applicantStatus,
          applicantApplicationType,
          applicantQueuePoints,
          applicantAddress,
          applicantHasParkingSpace,
          applicantHousingLeaseStatus,
          applicantPriority,
          sortOrder
        ) OUTPUT INSERTED.*
        VALUES ${placeholders}`,
        offerApplicantsValues.flat()
      )

      return offer
    })

    return { ok: true, data: transformToOfferFromDbOffer(offer, applicant) }
  } catch (err) {
    console.log(err)
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

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
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

//todo: rewrite this to use the new db structure and to return selectedApplicants / offeredApplicants
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
    logger.error(error, 'Error getting offer by offer id')
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

export async function updateOfferApplicant(
  db: Knex,
  params: {
    offerId: number
    listingId: number
    applicantId: number
    applicantStatus: ApplicantStatus
  }
): Promise<AdapterResult<null, 'no-update' | 'unknown'>> {
  try {
    const query = await db('offer_applicant')
      .update({ applicantStatus: params.applicantStatus })
      .where({
        offerId: params.offerId,
        listingId: params.listingId,
        applicantId: params.applicantId,
      })

    if (!query) {
      return { ok: false, err: 'no-update' }
    }

    return { ok: true, data: null }
  } catch (err) {
    logger.error(err, 'Error updating offer applicant')
    return { ok: false, err: 'unknown' }
  }
}

type NewDbOffer = DbOffer & {
  selectionSnapshot: Array<
    DbOfferApplicant & { applicantApplicationDate: string }
  >
  offeredApplicant: DbApplicant
}

export async function getOffersByListingId(
  listingId: number,
  dbConnection: Knex = db
): Promise<AdapterResult<Array<NewOffer>, 'unknown'>> {
  try {
    const rows = await dbConnection.raw<Array<NewDbOffer>>(`
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
        SELECT 
          offer_applicant.id,
          offer_applicant.listingId,
          offer_applicant.offerId,
          offer_applicant.applicantId,
          offer_applicant.applicantStatus,
          offer_applicant.applicantApplicationType,
          offer_applicant.applicantQueuePoints,
          offer_applicant.applicantAddress,
          offer_applicant.applicantHasParkingSpace,
          offer_applicant.applicantHousingLeaseStatus,
          offer_applicant.applicantPriority,
          offer_applicant.sortOrder,
          offer_applicant.createdAt,
          applicant.applicationDate as applicantApplicationDate
        FROM offer_applicant
        INNER JOIN applicant ON offer_applicant.applicantId = applicant.Id
        WHERE offer_applicant.offerId = offer.Id
        ORDER BY offer_applicant.sortOrder ASC
        FOR JSON PATH
      ) as selectionSnapshot
      FROM offer
      -- TODO: This is a SQL injection vulnerability. Use parameterized queries.
      WHERE offer.ListingId = ${listingId}
    `)

    const mappedRows = rows.map((row) => {
      const offeredApplicant = JSON.parse(row.offeredApplicant as any)
      const selectedApplicants = JSON.parse(row.selectionSnapshot as any)

      return transformOffer2(
        { ...row, selectionSnapshot: selectedApplicants },
        offeredApplicant
      )
    })

    return {
      ok: true,
      data: mappedRows,
    }
  } catch (err) {
    console.log(err)
    logger.error(err, 'Error getting offers by listing ID')
    return { ok: false, err: 'unknown' }
  }
}

const transformOffer2 = (
  o: NewDbOffer,
  offeredApplicant: DbApplicant
): NewOffer => {
  return {
    id: o.Id,
    sentAt: o.SentAt,
    expiresAt: o.ExpiresAt,
    answeredAt: o.AnsweredAt,
    status: o.Status,
    listingId: o.ListingId,
    createdAt: o.CreatedAt,
    offeredApplicant: {
      id: offeredApplicant.Id,
      name: offeredApplicant.Name,
      listingId: offeredApplicant.ListingId,
      status: offeredApplicant.Status,
      applicationType: offeredApplicant.ApplicationType ?? undefined,
      applicationDate: new Date(offeredApplicant.ApplicationDate),
      contactCode: offeredApplicant.ContactCode,
      nationalRegistrationNumber: offeredApplicant.NationalRegistrationNumber,
    },
    selectedApplicants: o.selectionSnapshot.map((a) => ({
      id: a.id,
      listingId: a.listingId,
      offerId: a.offerId,
      applicantId: a.applicantId,
      status: a.applicantStatus,
      applicationType: a.applicantApplicationType,
      queuePoints: a.applicantQueuePoints,
      address: a.applicantAddress,
      hasParkingSpace: a.applicantHasParkingSpace,
      housingLeaseStatus: a.applicantHousingLeaseStatus,
      priority: a.applicantPriority,
      sortOrder: a.sortOrder,
      createdAt: new Date(a.createdAt),
      applicationDate: new Date(a.applicantApplicationDate),
    })),
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

const transformToOfferFromDbOffer = (o: DbOffer, a: DbApplicant): NewOffer => {
  const {
    selectionSnapshot: selectedApplicants,
    applicantId: _applicantId,
    ...offer
  } = dbUtils.pascalToCamel(o)

  return {
    ...offer,
    selectedApplicants: (
      JSON.parse(selectedApplicants) as Array<OfferApplicant>
    ).map((a) => ({
      ...a,
      createdAt: new Date(a.createdAt),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      applicantApplicationDate: new Date(a.applicantApplicationDate),
    })),
    offeredApplicant: {
      ...dbUtils.pascalToCamel(a),
      applicationType: a.ApplicationType || undefined,
    },
  }
}
