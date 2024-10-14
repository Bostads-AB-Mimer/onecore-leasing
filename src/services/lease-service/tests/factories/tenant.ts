import { Factory } from 'fishery'
import { Tenant } from 'onecore-types'

import { LeaseFactory } from './lease'
import { NewTenant } from '../../get-tenant'

export const TenantFactory = Factory.define<NewTenant>(() => ({
  address: undefined,
  birthDate: new Date(),
  contactCode: '123',
  contactKey: '123',
  emailAddress: 'foo@example.com',
  firstName: 'foo',
  fullName: 'foo bar',
  isTenant: true,
  lastName: 'bar',
  nationalRegistrationNumber: 'foo bar',
  queuePoints: 0,
  phoneNumbers: undefined,
  parkingSpaceContracts: [],
  housingContracts: [LeaseFactory.build()],
  type: 'current',
  currentHousingContract: LeaseFactory.build(),
}))
