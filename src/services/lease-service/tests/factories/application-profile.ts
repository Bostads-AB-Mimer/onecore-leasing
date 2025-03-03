import { Factory } from 'fishery'
import { schemas } from 'onecore-types'
import { z } from 'zod'

type ApplicationProfile = z.infer<typeof schemas.v1.ApplicationProfileSchema>
type ApplicationProfileHousingReference = z.infer<
  typeof schemas.v1.ApplicationProfileHousingReferenceSchema
>

export const ApplicationProfileFactory = Factory.define<ApplicationProfile>(
  ({ sequence }) => ({
    id: sequence,
    contactCode: '12345',
    numAdults: 1,
    numChildren: 1,
    housingType: 'RENTAL',
    landlord: 'baz',
    housingTypeDescription: 'qux',
    createdAt: new Date(),
    expiresAt: new Date(),
    housingReference: ApplicationProfileHousingReferenceFactory.build(),
    lastUpdatedAt: new Date(),
  })
)

export const ApplicationProfileHousingReferenceFactory =
  Factory.define<ApplicationProfileHousingReference>(({ sequence }) => ({
    id: sequence,
    applicationProfileId: 1,
    email: 'email',
    phone: 'phone',
    reviewStatus: 'PENDING',
    comment: 'comment',
    reviewedAt: null,
    reviewedBy: 'foo',
    reasonRejected: null,

    expiresAt: new Date(),
    createdAt: new Date(),
  }))
