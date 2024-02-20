import { Lease, Contact, Invoices, Invoice, UnpaidInvoices, UnpaidInvoice } from 'onecore-types'

import knex from 'knex'
import Config from '../../../common/config'

const db = knex({
  client: 'mssql',
  connection: Config.database,
})

type PartialLease = {
  leaseId: Lease['leaseId']
  leaseStartDate: Lease['leaseStartDate']
  lastDebitDate: Lease['lastDebitDate']
}

//todo: move all transformation code to separate file
const transformFromDbContact = (
  row: any,
  phoneNumbers: any,
  leases: any
): Contact => {
  const contact = {
    contactCode: row.contactCode,
    contactKey: row.contactKey,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    leaseIds: leases,
    nationalRegistrationNumber: row.nationalRegistrationNumber,
    birthDate: row.birthDate,
    address: {
      street: row.street,
      number: '',
      postalCode: row.postalCode,
      city: row.city,
    },
    phoneNumbers: phoneNumbers,
    emailAddress: row.emailAddress,
    isTenant: leases.length > 0,
  }

  return contact
}

const transformFromDbLease = (
  row: any,
  tenantContactIds: string[] | undefined,
  tenants: Contact[] | undefined
): Lease => {
  const parsedLeaseId = row.leaseId.split('/')
  const rentalPropertyId = parsedLeaseId[0]
  const leaseNumber = parsedLeaseId[1]

  const lease = {
    leaseId: row.leaseId,
    leaseNumber: leaseNumber,
    rentalPropertyId: rentalPropertyId,
    type: row.leaseType,
    leaseStartDate: row.fromDate,
    leaseEndDate: row.toDate,
    status: row.Status, //todo: support status
    tenantContactIds,
    tenants,
    rentalProperty: undefined,
    rentInfo: undefined,
    address: undefined,
    noticeGivenBy: row.noticeGivenBy,
    noticeDate: row.noticeDate,
    noticeTimeTenant: row.noticeTimeTenant,
    preferredMoveOutDate: row.preferredMoveOutDate,
    terminationDate: row.terminationDate,
    contractDate: row.contractDate,
    lastDebitDate: row.lastDebitDate,
    approvalDate: row.approvalDate,
  }

  return lease
}

function transformFromDbInvoice(row: any): Invoice {
  return {
    invoiceId: row.invoiceId.trim(),
    leaseId: row.leaseId.trim(),
    amount: row.amount,
    fromDate: row.fromDate,
    toDate: row.toDate,
    invoiceDate: row.invoiceDate,
    expirationDate: row.expirationDate,
    debitStatus: row.debitStatus,
    paymentStatus: row.paymentStatus,
    transactionTypeName: row.transactionTypeName.trim()
  };
}

//todo: include contact/tentant info
const getLease = async (leaseId: string): Promise<Lease | undefined> => {
  const rows = await getLeaseById(leaseId)
  if (rows.length > 0) {
    return transformFromDbLease(rows[0], [], [])
  }
  return undefined
}

const getLeases = async (leaseIds: string[] | undefined): Promise<Lease[]> => {
  const leases: Lease[] = []

  const rows = await db('Lease')
    .select(
      'hyobj.hyobjben as leaseId',
      'hyhav.hyhavben as leaseType',
      'hyobj.uppsagtav as noticeGivenBy',
      'hyobj.avtalsdat as contractDate',
      'hyobj.sistadeb as lastDebitDate',
      'hyobj.godkdatum as approvalDate',
      'hyobj.uppsdatum as noticeDate',
      'hyobj.fdate as fromDate',
      'hyobj.tdate as toDate',
      'hyobj.uppstidg as noticeTimeTenant',
      'hyobj.onskflytt AS preferredMoveOutDate',
      'hyobj.makuldatum AS terminationDate'
    )
    .innerJoin('hyobj', 'hyobj.keyhyobj', 'hyavk.keyhyobj')
    .innerJoin('hyhav', 'hyhav.keyhyhav', 'hyobj.keyhyhav')
    .modify((queryBuilder) => {
      if (leaseIds) {
        queryBuilder.whereIn('hyobjben', leaseIds)
      }
    })
    .limit(100)

  for (const row of rows) {
    const lease = await transformFromDbLease(row, [], [])
    leases.push(lease)
  }

  return leases
}

//todo: include contact/tentant info
const getLeasesForNationalRegistrationNumber = async (
  nationalRegistrationNumber: string,
  includeTerminatedLeases: string | string[] | undefined
) => {
  const contact = await db('cmctc')
    .select('cmctc.keycmctc as contactKey')
    .limit(1)
    .where({
      persorgnr: nationalRegistrationNumber,
    })
    .limit(1)

  if (contact != undefined) {
    const leases = await getLeasesByContactKey(contact[0].contactKey)

    if (shouldIncludeTerminatedLeases(includeTerminatedLeases)) {
      return leases.filter(isLeaseActive)
    }

    return leases
  }

  return undefined
}

const getLeasesForContactCode = async (
  contactCode: string,
  includeTerminatedLeases: string | string[] | undefined
) => {
  const contact = await db('cmctc')
    .select('cmctc.keycmctc as contactKey')
    .limit(1)
    .where({
      cmctckod: contactCode,
    })
    .limit(1)

  if (contact != undefined) {
    const leases = await getLeasesByContactKey(contact[0].contactKey)

    if (shouldIncludeTerminatedLeases(includeTerminatedLeases)) {
      return leases.filter(isLeaseActive)
    }

    return leases
  }
}

const getContactByNationalRegistrationNumber = async (
  nationalRegistrationNumber: string,
  includeTerminatedLeases: string | string[] | undefined
) => {
  const rows = await getContactQuery()
    .where({ persorgnr: nationalRegistrationNumber })
    .limit(1)
  if (rows && rows.length > 0) {
    const phoneNumbers = await getPhoneNumbersForContact(rows[0].keycmobj)
    const leases = await getLeaseIds(
      rows[0].contactKey,
      includeTerminatedLeases
    )
    return transformFromDbContact(rows[0], phoneNumbers, leases)
  }

  return null
}

const getContactByContactCode = async (
  contactKey: string,
  includeTerminatedLeases: string | string[] | undefined
) => {
  const rows = await getContactQuery().where({ cmctckod: contactKey }).limit(1)
  if (rows && rows.length > 0) {
    const phoneNumbers = await getPhoneNumbersForContact(rows[0].keycmobj)
    const leases = await getLeaseIds(
      rows[0].contactKey,
      includeTerminatedLeases
    )
    return transformFromDbContact(rows[0], phoneNumbers, leases)
  }

  return null
}

const getContactQuery = () => {
  return db('cmctc')
    .select(
      'cmctc.cmctckod as contactCode',
      'cmctc.fnamn as firstName',
      'cmctc.enamn as lastName',
      'cmctc.cmctcben as fullName',
      'cmctc.persorgnr as nationalRegistrationNumber',
      'cmctc.birthdate as birthDate',
      'cmadr.adress1 as street',
      'cmadr.adress3 as postalCode',
      'cmadr.adress4 as city',
      'cmeml.cmemlben as emailAddress',
      'cmobj.keycmobj as keycmobj',
      'cmctc.keycmctc as contactKey'
    )
    .innerJoin('cmobj', 'cmobj.keycmobj', 'cmctc.keycmobj')
    .innerJoin('cmadr', 'cmadr.keycode', 'cmobj.keycmobj')
    .innerJoin('cmeml', 'cmeml.keycmobj', 'cmobj.keycmobj')
}

const getInvoiceStatusOfContact = async (
  contactKey: string,
): Promise<Invoices | undefined> => {
  const rows = await db.select(
    'krfkh.invoice as invoiceId',
    'krfkh.reference as leaseId',
    'krfkh.amount as amount',
    'krfkh.fromdate as fromDate',
    'krfkh.todate as toDate',
    'krfkh.invdate as invoiceDate',
    'krfkh.expdate as expirationDate',
    'krfkh.debstatus as debitStatus',
    'krfkh.paystatus as paymentStatus',
    'revrt.name as transactionTypeName', //not really needed?
  )
    .from('krfkh')
    .innerJoin('cmctc', 'cmctc.keycmctc', 'krfkh.keycmctc')
    .innerJoin('revrt', 'revrt.keyrevrt', 'krfkh.keyrevrt')
    .where({ 'cmctc.cmctckod': contactKey })

  if (rows && rows.length > 0) {
    const invoices: Invoice[] = rows.map(transformFromDbInvoice);

    if(invoices.length === 0) {
      return undefined;
    }

    let unpaidInvoices = invoices.filter((invoice: any) => invoice.paymentStatus === 0 || invoice.paymentStatus === 1 )
    const paidInvoices = invoices.filter((invoice: any) => invoice.paymentStatus > 1 )

    unpaidInvoices = unpaidInvoices.filter(unpaidInvoice => {
      // If a paid invoice exists with the same invoice id and amount is 0, the invoice is considered paid (probably handled by debt collector)
      return !paidInvoices.some(paidInvoice => paidInvoice.invoiceId === unpaidInvoice.invoiceId && unpaidInvoice.amount === 0);
    });

    return {
      unpaidInvoices: unpaidInvoices,
      paidInvoices: paidInvoices,
    }
  }

  return undefined
}

const getUnpaidInvoicesOfContact = async (
  contactKey: string,
): Promise<UnpaidInvoices | undefined> =>  {
  var allInvoices = await getInvoiceStatusOfContact(contactKey);

  if(allInvoices?.unpaidInvoices == undefined) {
    return undefined;
  }

  let accumulatedLastDebitDaysSinceToday = 0;

  let unpaidInvoices: UnpaidInvoice[] | undefined = allInvoices?.unpaidInvoices.map((invoice: Invoice) => {
    const today = new Date();
    const daysSinceLastDebitDate = Math.floor((today.getTime() - invoice.fromDate.getTime()) / (1000 * 60 * 60 * 24));
    accumulatedLastDebitDaysSinceToday += daysSinceLastDebitDate;
    return {
      invoice: invoice.invoiceId,
      amount: invoice.amount,
      fromDate: invoice.fromDate,
      toDate: invoice.toDate,
      daysSinceLastDebitDate: daysSinceLastDebitDate,
    }
  })

  return  {
    invoices: unpaidInvoices,
    numberOfUnpaidInvoices: unpaidInvoices.length,
    accumulatedLastDebitDaysSinceToday: accumulatedLastDebitDaysSinceToday
  }
}

const getPhoneNumbersForContact = async (keycmobj: string) => {
  const rows = await db('cmtel')
    .select(
      'cmtelben as phoneNumber',
      'keycmtet as type',
      'main as isMainNumber'
    )
    .where({ keycmobj: keycmobj })
  return rows
}

//todo: extend with type of lease? the type is found in hyhav.hyhavben
//todo: be able to filter on active contracts
const getLeaseIds = async (
  keycmctc: string,
  includeTerminatedLeases: string | string[] | undefined
) => {
  includeTerminatedLeases = Array.isArray(includeTerminatedLeases)
    ? includeTerminatedLeases[0]
    : includeTerminatedLeases
  const rows = await db('hyavk')
    .select(
      'hyobj.hyobjben as leaseId',
      'hyobj.fdate as leaseStartDate',
      'hyobj.sistadeb as lastDebitDate'
    )
    .innerJoin('hyobj', 'hyobj.keyhyobj', 'hyavk.keyhyobj')
    .where({ keycmctc: keycmctc })

  if (!includeTerminatedLeases || includeTerminatedLeases === 'false') {
    return rows.filter(isLeaseActive).map((x) => x.leaseId)
  }
  return rows.map((x) => x.leaseId)
}

const getLeasesByContactKey = async (keycmctc: string) => {
  const rows = await db('hyavk')
    .select(
      'hyobj.hyobjben as leaseId',
      'hyhav.hyhavben as leaseType',
      'hyobj.uppsagtav as noticeGivenBy',
      'hyobj.avtalsdat as contractDate',
      'hyobj.sistadeb as lastDebitDate',
      'hyobj.godkdatum as approvalDate',
      'hyobj.uppsdatum as noticeDate',
      'hyobj.fdate as fromDate',
      'hyobj.tdate as toDate',
      'hyobj.uppstidg as noticeTimeTenant',
      'hyobj.onskflytt AS preferredMoveOutDate',
      'hyobj.makuldatum AS terminationDate'
    )
    .innerJoin('hyobj', 'hyobj.keyhyobj', 'hyavk.keyhyobj')
    .innerJoin('hyhav', 'hyhav.keyhyhav', 'hyobj.keyhyhav')
    .where({ keycmctc: keycmctc })

  const leases: any[] = []
  for (const row of rows) {
    const lease = await transformFromDbLease(row, [], [])
    leases.push(lease)
  }

  return leases
}

const getLeaseById = async (hyobjben: string) => {
  const rows = await db('hyavk')
    .select(
      'hyobj.hyobjben as leaseId',
      'hyhav.hyhavben as leaseType',
      'hyobj.uppsagtav as noticeGivenBy',
      'hyobj.avtalsdat as contractDate',
      'hyobj.sistadeb as lastDebitDate',
      'hyobj.godkdatum as approvalDate',
      'hyobj.uppsdatum as noticeDate',
      'hyobj.fdate as fromDate',
      'hyobj.tdate as toDate',
      'hyobj.uppstidg as noticeTimeTenant',
      'hyobj.onskflytt AS preferredMoveOutDate',
      'hyobj.makuldatum AS terminationDate'
    )
    .innerJoin('hyobj', 'hyobj.keyhyobj', 'hyavk.keyhyobj')
    .innerJoin('hyhav', 'hyhav.keyhyhav', 'hyobj.keyhyhav')
    .where({ hyobjben: hyobjben })
  return rows
}

const shouldIncludeTerminatedLeases = (
  includeTerminatedLeases: string | string[] | undefined
) => {
  const queryParamResult = Array.isArray(includeTerminatedLeases)
    ? includeTerminatedLeases[0]
    : includeTerminatedLeases

  return !(!queryParamResult || queryParamResult === 'false')
}

const isLeaseActive = (lease: Lease | PartialLease): boolean => {
  const currentDate = new Date()
  const leaseStartDate = new Date(lease.leaseStartDate)
  const lastDebitDate = lease.lastDebitDate
    ? new Date(lease.lastDebitDate)
    : null

  return (
    leaseStartDate < currentDate &&
    (!lastDebitDate || currentDate < lastDebitDate)
  )
}

export {
  getLease,
  getLeases,
  getLeasesForContactCode,
  getLeasesForNationalRegistrationNumber,
  getContactByNationalRegistrationNumber,
  getContactByContactCode,
  getInvoiceStatusOfContact,
  getUnpaidInvoicesOfContact,
  isLeaseActive,
}
