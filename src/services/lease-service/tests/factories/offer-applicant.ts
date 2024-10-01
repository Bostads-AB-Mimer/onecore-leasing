import { Factory } from 'fishery'
import { ApplicantStatus, LeaseStatus } from 'onecore-types'
// TODO: import from onecore-types
import { DbOfferApplicant, OfferApplicant } from '../../adapters/offer-adapter'

export const OfferApplicantFactory = Factory.define<OfferApplicant>(
  ({ sequence }) => ({
    id: sequence,
    listingId: 1,
    offerId: 1,
    applicantId: 1,
    priority: 1,
    queuePoints: 1,
    status: ApplicantStatus.Active,
    address: 'Testgatan 14',
    applicationType: 'Additional',
    hasParkingSpace: true,
    housingLeaseStatus: LeaseStatus.Current,
    createdAt: new Date(),
    applicationDate: new Date(),
    sortOrder: sequence,
  })
)

export const DbOfferApplicantFactory = Factory.define<DbOfferApplicant>(
  ({ sequence }) => ({
    id: sequence,
    listingId: 1,
    offerId: 1,
    applicantId: 1,
    applicantPriority: 1,
    applicantQueuePoints: 1,
    applicantStatus: ApplicantStatus.Active,
    applicantAddress: 'Testgatan 14',
    applicantApplicationType: 'Additional',
    applicantHasParkingSpace: true,
    applicantHousingLeaseStatus: LeaseStatus.Current,
    createdAt: new Date(),
    applicantApplicationDate: new Date(),
    sortOrder: sequence,
  })
)
