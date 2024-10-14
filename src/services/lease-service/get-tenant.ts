import { Address, Lease, Tenant } from 'onecore-types'
import { logger } from 'onecore-utilities'

import { AdapterResult } from './adapters/types'
import * as estateCodeAdapter from './adapters/xpand/estate-code-adapter'
import * as tenantLeaseAdapter from './adapters/xpand/tenant-lease-adapter'
import * as xpandSoapAdapter from './adapters/xpand/xpand-soap-adapter'
import * as priorityListService from './priority-list-service'

type GetTenantError =
  | 'get-contact'
  | 'contact-not-found'
  | 'contact-not-tenant'
  | 'get-waiting-lists'
  | 'waiting-list-internal-parking-space-not-found'
  | 'get-contact-leases'
  | 'contact-leases-not-found'
  | 'get-residential-area'
  | 'housing-contracts-not-found'
  | 'get-lease-property-info'

type NonEmptyArray<T> = [T, ...T[]]

export type TenantHousingContractInfo =
  | {
      type: 'current'
      currentHousingContract: Lease
      upcomingHousingContract?: Lease
    }
  | { type: 'upcoming'; upcomingHousingContract: Lease }

export type NewTenant = {
  contactCode: string
  contactKey: string
  firstName: string
  lastName: string
  fullName: string
  nationalRegistrationNumber: string
  birthDate: Date
  address?: Address
  phoneNumbers: Tenant['phoneNumbers'] // This should just be PhoneNumber[] and pls remove optional. Rather empty list
  emailAddress?: string
  queuePoints: number
  parkingSpaceContracts: Lease[]
  housingContracts: NonEmptyArray<Lease>
} & TenantHousingContractInfo

export async function getTenant(params: {
  contactCode: string
}): Promise<AdapterResult<NewTenant, GetTenantError>> {
  const contact = await tenantLeaseAdapter.getContactByContactCode(
    params.contactCode,
    'false'
  )
  if (!contact.ok) {
    return { ok: false, err: 'get-contact' }
  }

  if (!contact.data) {
    return { ok: false, err: 'contact-not-found' }
  }

  if (contact.data.isTenant !== true) {
    return { ok: false, err: 'contact-not-tenant' }
  }

  const waitingList = await xpandSoapAdapter.getWaitingList(
    contact.data.nationalRegistrationNumber
  )

  if (!waitingList.ok) {
    return { ok: false, err: 'get-waiting-lists' }
  }

  const waitingListForInternalParkingSpace =
    priorityListService.parseWaitingListForInternalParkingSpace(
      waitingList.data
    )

  if (!waitingListForInternalParkingSpace) {
    return {
      ok: false,
      err: 'waiting-list-internal-parking-space-not-found',
    }
  }

  const leases = await tenantLeaseAdapter.getLeasesForContactCode(
    contact.data.contactCode,
    'true',
    undefined
  )

  if (!leases.ok) {
    return {
      ok: false,
      err: 'get-contact-leases',
    }
  }

  if (!leases.data.length) {
    return {
      ok: false,
      err: 'contact-leases-not-found',
    }
  }

  const activeAndUpcomingLeases = leases.data.filter(
    priorityListService.isLeaseActiveOrUpcoming
  )

  const leasesWithResidentialArea = await Promise.all(
    activeAndUpcomingLeases.map(async (lease) => {
      const residentialArea =
        await tenantLeaseAdapter.getResidentialAreaByRentalPropertyId(
          lease.rentalPropertyId
        )

      if (!residentialArea.ok) {
        throw new Error('Err getting residential area')
      }

      return {
        ...lease,
        residentialArea: residentialArea.data,
      }
    })
  )
    .then((data) => ({ ok: true, data }) as const)
    .catch((err) => ({ ok: false, err }) as const)

  if (!leasesWithResidentialArea.ok) {
    return { ok: false, err: 'get-residential-area' }
  }

  const housingContracts = priorityListService.parseLeasesForHousingContracts(
    leasesWithResidentialArea.data
  )

  if (!housingContracts) {
    return { ok: false, err: 'housing-contracts-not-found' }
  }

  const [currentHousingContract, upcomingHousingContract] = housingContracts

  const leasesWithPropertyType = await Promise.all(
    leasesWithResidentialArea.data.map(async (l) => {
      const type = await estateCodeAdapter
        .getEstateCodeFromXpandByRentalObjectCode(l.rentalPropertyId)
        .then((v) => v?.type)

      return { ...l, propertyType: type }
    })
  )
    .then((data) => ({ ok: true, data }) as const)
    .catch((err) => ({ ok: false, err }) as const)

  if (!leasesWithPropertyType.ok) {
    return { ok: false, err: 'get-lease-property-info' }
  }

  const parkingSpaceContracts = priorityListService.parseLeasesForParkingSpaces(
    leasesWithPropertyType.data
  )

  try {
    return {
      ok: true,
      data: {
        contactCode: contact.data.contactCode,
        contactKey: contact.data.contactKey,
        birthDate: contact.data.birthDate,
        firstName: contact.data.firstName,
        lastName: contact.data.lastName,
        fullName: contact.data.fullName,
        emailAddress: contact.data.emailAddress,
        nationalRegistrationNumber: contact.data.nationalRegistrationNumber,
        phoneNumbers: contact.data.phoneNumbers,
        queuePoints: waitingListForInternalParkingSpace.queuePoints,
        address: contact.data.address,
        parkingSpaceContracts,
        housingContracts: [
          currentHousingContract,
          upcomingHousingContract,
        ].filter(Boolean) as NonEmptyArray<Lease>,
        ...mapHousingContractsToContractInfo({
          currentHousingContract,
          upcomingHousingContract,
        }),
      },
    }
  } catch (err) {
    logger.error(err, 'Error getting tenant')
    return { ok: false, err: 'housing-contracts-not-found' }
  }
}

const mapHousingContractsToContractInfo = (params: {
  currentHousingContract?: Lease
  upcomingHousingContract?: Lease
}): TenantHousingContractInfo => {
  if (params.currentHousingContract) {
    return {
      type: 'current',
      currentHousingContract: params.currentHousingContract,
      upcomingHousingContract: params.upcomingHousingContract,
    }
  } else if (params.upcomingHousingContract) {
    return {
      type: 'upcoming',
      upcomingHousingContract: params.upcomingHousingContract,
    }
  } else {
    throw new Error(
      'No housing contract found when mapping contracts to tenant compatible type'
    )
  }
}
