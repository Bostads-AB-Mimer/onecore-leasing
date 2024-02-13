import { Contact, Lease } from '../../../common/types'
import knex from 'knex'
import Config from '../../../common/config'
import { transformFromDbLease } from './tenant-lease-adapter'

const db = knex({
  client: 'mssql',
  connection: Config.database,
})


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
    LeaseId: contact.leaseIds,
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

const updateContact = async (contact: Contact) => {
  const rows = await db('contact').where({
    ContactId: contact.contactId,
    LeaseId: contact.leaseIds,
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

const updateLeases = async (leases: Lease[]) => {
  for (const lease of leases) {
    await updateLease(lease)
  }
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

export {
  updateContact,
  updateContacts,
  updateLease,
  updateLeases,
}