import { Lease, Contact, Address } from '../../../common/types'
import knex from 'knex'
import Config from '../../../common/config'

const db = knex({
  client: 'mssql',
  connection: Config.database,
})

const transformFromDbContact = (row: any, phoneNumbers: any, isTenant: boolean): Contact => {
  const contact = {
    contactId: row.contactId,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    type: row.contractrelation,
    leaseId: row.contractid,
    lease: undefined,
    nationalRegistrationNumber: row.nationalRegistrationNumber,
    birthDate: row.birthDate, //does not exist hy_contact
    address: {
      street: row.street,
      number: '',
      postalCode: row.postalCode,
      city: row.city,
    },
    phoneNumbers: phoneNumbers,
    emailAddress: row.emailAddress,
    isTenant: isTenant,
    lastUpdated: row.ContactLastUpdated, //does not exist hy_contact
  }

  return contact
}

const transformAddressFromDb = (row: any): Address => {
  if (row.LeaseType.startsWith('Bostadskontrakt')) {
    return {
      city: row.DwellingCity,
      number: '',
      postalCode: row.DwellingPostalCode,
      street: row.DwellingStreet,
    }
  }
  if (row.LeaseType.startsWith('P-Platskontrakt') || row.LeaseType.startsWith('Garagekontrakt')) {
    return {
      city: row.VehicleSpaceCity,
      number: '',
      postalCode: row.VehicleSpacePostalCode,
      street: row.VehicleSpaceStreet,
    }
  }

  //todo: handle other types of leases
  //todo: default case (get contact)

  return {
    street: row.street,
    number: row.streetNumber,
    postalCode: row.postalCode,
    city: row.city,
  }
}

const transformFromDbLease = (
  row: any,
  tenantContactIds: string[] | undefined,
  tenants: Contact[] | undefined,
): Lease => {
  const lease = {
    leaseId: row.LeaseLeaseId,
    leaseNumber: row.LeaseNumber,
    leaseStartDate: row.LeaseStartDate,
    leaseEndDate: row.LeaseEndDate,
    status: row.Status,
    tenantContactIds,
    tenants,
    rentalPropertyId: row.RentalPropertyId,
    type: row.LeaseType,
    rentalProperty: undefined,
    lastUpdated: row.LeaseLastUpdated,
    rentInfo: undefined,
    address: undefined,
  }

  return lease
}

const transformToDbLease = (lease: Lease) => {
  const dbLease = {
    LeaseId: lease.leaseId,
    LeaseNumber: lease.leaseNumber,
    LeaseStartDate: lease.leaseStartDate,
    LeaseEndDate: lease.leaseEndDate,
    RentalPropertyId: lease.rentalPropertyId,
    Status: lease.status,
    Type: lease.type,
    LastUpdated: lease.lastUpdated,
  }

  return dbLease
}

const transformToDbContact = (contact: Contact) => {
  const dbContact = {
    ContactId: contact.contactId,
    FirstName: contact.firstName,
    LastName: contact.lastName,
    FullName: contact.fullName,
    Type: contact.type,
    LeaseId: contact.leaseId,
    NationalRegistrationNumber: contact.nationalRegistrationNumber,
    BirthDate: contact.birthDate,
    Street: contact.address?.street,
    StreetNumber: contact.address?.number,
    PostalCode: contact.address?.postalCode,
    City: contact.address?.city,
    // MobilePhone: contact.mobilePhone,
    // PhoneNumber: contact.phoneNumber,
    EmailAddress: contact.emailAddress,
    LastUpdated: contact.lastUpdated,
  }

  return dbContact
}

const getAddressOfRentalObject = async (rentalPropertyId: string, leaseType: string): Promise<Address | undefined> => {
  let rows: any[] = []
  console.log('rentalpropertyid : lease type: ', rentalPropertyId, leaseType)
  if (leaseType.startsWith('Bostadskontrakt')) {

    rows = await db('ba_dwelling').select(
      'ba_dwelling.postaladdress as street',
      //'ba_dwelling.StreetNumber as StreetNumber', todo: split street number from street?
      'ba_dwelling.zipcode as postalCode',
      'ba_dwelling.city as city',
    )
      .where({ 'ba_dwelling.rentalpropertyid': rentalPropertyId })
  } else if (leaseType.startsWith('P-Platskontrakt') || leaseType.startsWith('Garagekontrakt')) {
    console.log('Platskontrakt / Garagekontrakt: ', rentalPropertyId, leaseType)
    rows = await db('ba_vehiclespace').select(
      '*',
      'ba_vehiclespace.postaladdress as street',
      //'ba_dwelling.StreetNumber as StreetNumber', todo: split street number from street?
      'ba_vehiclespace.zipcode as postalCode',
      'ba_vehiclespace.city as city',
    )
      .where({ 'ba_vehiclespace.rentalpropertyid': rentalPropertyId })
  }

  if (rows.length >= 1) {
    return {
      city: rows[0].city,
      number: '',
      postalCode: rows[0].postalCode,
      street: rows[0].street,
    }
  }

  return undefined
}

const getLease = async (leaseId: string): Promise<Lease | undefined> => {
  //todo: handle garage, parking spot etc in query
  const rows = await db('hy_contract')
    .select(
      '*',
      'hy_contact.contractid as ContactLeaseId',
      'hy_contract.contractid as LeaseLeaseId',
      'hy_contact.category as ContactType',
      'hy_contract.contracttype as LeaseType',
      //'ba_dwelling.postaladdress as DwellingStreet',
      //'ba_dwelling.StreetNumber as StreetNumber', todo: split street number from street?
      // 'ba_dwelling.zipcode as DwellingPostalCode',
      // 'ba_dwelling.city as DwellingCity',
      // 'ba_vehiclespace.postaladdress as VehicleSpaceStreet',
      // //'ba_vechiclespace.StreetNumber as StreetNumber', todo: split street number from street?
      // 'ba_vehiclespace.zipcode as VehicleSpacePostalCode',
      // 'ba_vehiclespace.city as VehicleSpaceCity',
      //timestamps do not exist in xpand db
      //'Lease.LastUpdated as LeaseLastUpdated',
      //'Contact.LastUpdated as ContactLastUpdated',
    )
    .innerJoin('hy_contact', 'hy_contract.contractid', 'hy_contact.contractid')
    // .leftJoin('ba_dwelling', 'ba_dwelling.rentalpropertyid', 'hy_contract.rentalpropertyid')
    // .leftJoin('ba_vehiclespace', 'ba_vehiclespace.rentalpropertyid', 'hy_contract.rentalpropertyid')
    .where({ 'hy_contract.contractid': leaseId })

  //debug
  // console.log("-----'")
  // console.log('contract rows: ', rows)
  // console.log("-----'")

  if (rows && rows.length > 0) {
    const tenantPersonIds: string[] = []
    const tenants: Contact[] = []

    const lease = transformFromDbLease(rows[0], tenantPersonIds, tenants)


    const getAddressPromises: Promise<void>[] = []
    rows.forEach((row) => {
      getAddressPromises.push(getAddressOfRentalObject(row.rentalpropertyid, row.LeaseType)
        .then((address) => {
          lease.address = address
          lease.tenantContactIds?.push(row.ContactId)
          //lease.tenants?.push(transformFromDbContact(row))
        }),
      )
    })

    // Wait for all getAddressOfRentalObject calls to complete
    return Promise.all(getAddressPromises)
      .then(() => lease)
  }

  return undefined
}

//todo: map to xpand db
const getLeases = async (leaseIds?: string[] | undefined): Promise<Lease[]> => {
  const leases: Lease[] = []

  const rows = await db('Lease')
    .select(
      '*',
      'Contact.LeaseId as ContactLeaseId',
      'Lease.LeaseId as LeaseLeaseId',
      'Contact.Type as ContactType',
      'Lease.Type as LeaseType',
      'Lease.LastUpdated as LeaseLastUpdated',
      'Contact.LastUpdated as ContactLastUpdated',
    )
    .innerJoin('Contact', 'Lease.LeaseId', 'Contact.LeaseId')
    .modify((queryBuilder) => {
      if (leaseIds) {
        queryBuilder.whereIn('Lease.LeaseId', leaseIds)
      }
    })
    .limit(100)

  let lastLeaseId: string | null = null
  let tenantContactIds: string[] = []
  let tenants: Contact[] = []
  let lease: Lease | null = null

  for (let i = 0; i < rows.length; i++) {
    if (!lastLeaseId || lastLeaseId != rows[i].LeaseId) {
      tenantContactIds = []
      tenants = []
      lease = transformFromDbLease(rows[i], tenantContactIds, tenants)
      leases.push(lease)
    }
    lease?.tenantContactIds?.push(rows[i].ContactId)
    //lease?.tenants?.push(transformFromDbContact(rows[i]))

    lastLeaseId = rows[i].LeaseId
  }

  return leases
}

const getLeasesFor = async (nationalRegistrationNumber: string) => {
  const rows = await db('hy_contact').where({
    socsecno: nationalRegistrationNumber,
  })

  if (rows && rows.length > 0) {
    const leaseIds = rows.map((row) => {
      return row.contractid
    })

    const uniqueLeaseIds = Array.from(new Set(leaseIds))
    const leases: Lease[] = []

    for (const leaseId of uniqueLeaseIds) {
      const lease = await getLease(leaseId)
      if (lease) {
        leases.push(lease)
      }
    }

    return leases
  }

  return null
}

const updateLease = async (lease: Lease) => {
  const rows = await db('lease').where({
    LeaseId: lease.leaseId,
  })

  let inserted = 0
  let updated = 0
  let dbLease = transformToDbLease(lease)

  if (rows && rows.length > 0) {
    process.stdout.write('.')
    const existingDbLease = rows[0]
    if (
      !lease.lastUpdated ||
      !existingDbLease.LastUpdated ||
      lease.lastUpdated.getDate() > existingDbLease.LastUpdated.getDate()
    ) {
      dbLease.LastUpdated = new Date()
      const updatedLease = await db('lease')
        .update(dbLease)
        .returning('*')
        .where({ LeaseId: dbLease.LeaseId })
      dbLease = updatedLease[0]
      updated++
    }
  } else {
    process.stdout.write('*')
    dbLease.LastUpdated = new Date()
    const insertedPerson = await db('lease').insert(dbLease).returning('*')
    dbLease = insertedPerson[0]
    inserted++
  }

  return {
    lease: transformFromDbLease(dbLease, undefined, undefined),
    meta: {
      updated,
      inserted,
    },
  }
}

const updateLeases = async (leases: Lease[]) => {
  for (const lease of leases) {
    await updateLease(lease)
  }
}

const getContact = async (nationalRegistrationNumber: string) => {
  const rows = await db('cmctc').select(
    'cmctc.cmctckod as contactId',
    //leaseId
    //lease
    //type
    'cmctc.fnamn as firstName',
    'cmctc.enamn as lastName',
    'cmctc.cmctcben as fullName',
    'cmctc.persorgnr as nationalRegistrationNumber',
    'cmctc.birthdate as birthDate',
    'cmadr.adress1 as street',
    //address.number
    'cmadr.adress3 as postalCode',
    'cmadr.adress4 as city',
    'cmobj.keycmobj as keycmobj',
    'cmeml.cmemlben as emailAddress',
           'cmctc.keycmctc as keycmctc'
  ).innerJoin('cmobj', 'cmobj.keycmobj', 'cmctc.keycmobj')
    .innerJoin('cmadr', 'cmadr.keycode ', 'cmobj.keycmobj')
    .innerJoin('cmeml', 'cmeml.keycmobj', 'cmobj.keycmobj')
    .where({
      persorgnr: nationalRegistrationNumber,
    })
    .limit(1)
  if (rows && rows.length > 0) {
    console.log(rows[0])
    var phoneNumbers = await getPhoneNumbersForContact(rows[0].keycmobj)
    var rentalProperties = await getRentalPropertiesForContact(rows[0].keycmctc)
    var isTenant = rentalProperties.length > 0
    console.log("rentalProperties", rentalProperties)
    return transformFromDbContact(rows[0], phoneNumbers, isTenant)
  }

  return null
}

const getPhoneNumbersForContact = async (keycmobj: string) => {
  var rows = await db('cmtel').select(
    'cmtelben as phoneNumber',
    'keycmtet as type',
    'main as isMainNumber',
  ).where({ keycmobj: keycmobj })
  return rows
}

//todo: rename
const getRentalPropertiesForContact = async (keycmctc: string) => {
  var rows = await db('hyavk').select(
    '*',
  )//.innerJoin('hyobj', 'hyobj.keyhyobj', 'hyavk.keyhyobj')
    .where({ keycmctc: keycmctc })
  return rows
}

const updateContact = async (contact: Contact) => {
  const rows = await db('contact').where({
    ContactId: contact.contactId,
    LeaseId: contact.leaseId,
  })

  let inserted = 0
  let updated = 0
  let dbContact = transformToDbContact(contact)

  if (rows && rows.length > 0) {
    const existingDbContact = rows[0]
    process.stdout.write('.')

    if (
      !contact.lastUpdated ||
      !existingDbContact.LastUpdated ||
      contact.lastUpdated.getDate() > existingDbContact.LastUpdated.getDate()
    ) {
      dbContact.LastUpdated = new Date()
      const updatedPerson = await db('contact')
        .update(dbContact)
        .returning('*')
        .where({ ContactId: dbContact.ContactId, LeaseId: dbContact.LeaseId })
      dbContact = updatedPerson[0]
      updated++
    }
  } else {
    process.stdout.write('*')
    dbContact.LastUpdated = new Date()
    const insertedPerson = await db('contact').insert(dbContact).returning('*')
    dbContact = insertedPerson[0]
    inserted++
  }

  return {
    person: undefined,//transformFromDbContact(dbContact),
    meta: {
      updated,
      inserted,
    },
  }
}

const updateContacts = async (contacts: Contact[]) => {
  for (const contact of contacts) {
    await updateContact(contact)
  }
}

export {
  getLease,
  getLeases,
  getLeasesFor,
  updateLease,
  updateLeases,
  getContact,
  updateContact,
  updateContacts,
}
