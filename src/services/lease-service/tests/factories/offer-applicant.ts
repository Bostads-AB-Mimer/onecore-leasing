import { Factory } from 'fishery'
import { ApplicantStatus, LeaseStatus } from 'onecore-types'
// TODO: import from onecore-types
import { OfferApplicant } from '../../adapters/offer-adapter'

export const OfferApplicantFactory = Factory.define<OfferApplicant>(
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
