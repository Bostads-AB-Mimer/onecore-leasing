import { VacantParkingSpace } from 'onecore-types'

import knex from 'knex'
import Config from '../../../../common/config'
import { logger } from 'onecore-utilities'
import { AdapterResult } from '../types'

const db = knex({
  client: 'mssql',
  connection: Config.xpandDatabase,
})

function trimRow(obj: any): any {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trimEnd() : value,
    ])
  )
}

const districts = {
  'Distrikt Mitt': [
    'Centrum',
    'Gryta',
    'Skallberget',
    'Nordanby',
    'Vega',
    'Hökåsen',
  ],
  'Distrikt Norr': [
    'Oxbacken',
    'Jakobsberg',
    'Pettersberg',
    'Vallby',
    'Skultuna',
  ],
  'Distrikt Väst': [
    'Vetterstorp',
    'Vetterslund',
    'Råby',
    'Hammarby',
    'Fredriksberg',
    'Bäckby',
    'Skälby',
  ],
  'Distrikt Öst': [
    'Lillåudden',
    'Gideonsberg',
    'Hemdal',
    'Haga',
    'Malmaberg',
    'Skiljebo',
    'Viksäng',
    'Öster Mälarstrand',
  ],
  'Mimer Student': ['Student'],
}

function transformFromXpandListing(row: any): VacantParkingSpace {
  const scegcaption = row.scegcaption?.toUpperCase() || '' // Normalize case and handle undefined
  let district = '-'
  let districtCode: string | undefined = undefined
  let restidentalAreaCaption: string = '-'

  // Extract district code (number before ':')
  const match = scegcaption.match(/^(\d+):/)
  if (match) {
    districtCode = match[1] // Extract the number before ':'
  }

  // Determine district and restidentalAreaCaption based on scegcaption
  for (const [key, locations] of Object.entries(districts)) {
    const matchedLocation = locations.find((location) =>
      scegcaption.includes(location.toUpperCase())
    )
    if (matchedLocation) {
      district = key
      restidentalAreaCaption = matchedLocation // Save the matched location (not uppercased)
      break
    }
  }

  // Transform the row and add district info
  return {
    rentalObjectCode: row.rentalObjectCode,
    address: row.postaladdress,
    monthlyRent: row.MonthlyRent, // TODO: Add rent info if available
    blockCaption: row.blockcaption || undefined,
    blockCode: row.blockcode || undefined,
    restidentalAreaCode: row.scegcode || undefined,
    objectTypeCaption: row.vehiclespacetypecaption || undefined,
    objectTypeCode: row.vehiclespacetypecode || undefined,
    vacantFrom: row.lastdebitdate || new Date(), // TODO: Add logic for vacantFrom
    vehicleSpaceCaption: row.vehiclespacecaption || undefined,
    vehicleSpaceCode: row.vehiclespacecode || undefined,
    districtCaption: district,
    districtCode: districtCode,
    restidentalAreaCaption: restidentalAreaCaption, // Add the location
  }
}

const getAllVacantParkingSpaces = async (): Promise<
  AdapterResult<VacantParkingSpace[], unknown>
> => {
  try {
    // Subquery for ParkingSpaces
    const parkingSpacesQuery = db
      .from('babps')
      .select(
        'babps.keycmobj',
        'babuf.hyresid as rentalObjectCode',
        'babps.code as vehiclespacecode',
        'babps.caption as vehiclespacecaption',
        'babuf.cmpcode as companycode',
        'babuf.cmpcaption as companycaption',
        'babuf.fencode as scegcode',
        'babuf.fencaption as scegcaption',
        'babuf.fstcode as estatecode',
        'babuf.fstcaption as estatecaption',
        'babuf.bygcode as blockcode',
        'babuf.bygcaption as blockcaption',
        'babpt.code as vehiclespacetypecode',
        'babpt.caption as vehiclespacetypecaption',
        'babps.platsnr as vehiclespacenumber',
        'cmadr.adress1 as postaladdress',
        'cmadr.adress2 as street',
        'cmadr.adress3 as zipcode',
        'cmadr.adress4 as city'
      )
      .innerJoin('babuf', 'babuf.keycmobj', 'babps.keycmobj')
      .innerJoin('babpt', 'babpt.keybabpt', 'babps.keybabpt')
      .leftJoin('cmadr', function () {
        this.on('cmadr.keycode', '=', 'babps.keycmobj')
          .andOn('cmadr.keydbtbl', '=', db.raw('?', ['_RQA11RNMA']))
          .andOn('cmadr.keycmtyp', '=', db.raw('?', ['adrpost']))
      })
      .where('babuf.cmpcode', '=', '001')

    // Subquery for ActiveRentalBlocks
    const activeRentalBlocksQuery = db
      .from('hyspt')
      .select(
        'hyspt.keycmobj',
        'hyspa.caption as blocktype',
        'hyspt.fdate as blockstartdate',
        'hyspt.tdate as blockenddate'
      )
      .innerJoin('hyspa', 'hyspa.keyhyspa', 'hyspt.keyhyspa')
      .where(function () {
        this.whereNull('hyspt.fdate').orWhere('hyspt.fdate', '<=', db.fn.now())
      })
      .andWhere(function () {
        this.whereNull('hyspt.tdate').orWhere('hyspt.tdate', '>', db.fn.now())
      })

    // Subquery for ActiveContracts
    const activeContractsQuery = db
      .from('hyobj')
      .select(
        'hyinf.keycmobj',
        'hyobj.hyobjben as contractid',
        'hyobj.avtalsdat as contractdate',
        'hyobj.fdate as fromdate',
        'hyobj.tdate as todate',
        'hyobj.sistadeb as lastdebitdate'
      )
      .innerJoin('hykop', function () {
        this.on('hykop.keyhyobj', '=', 'hyobj.keyhyobj').andOn(
          'hykop.ordning',
          '=',
          db.raw('?', [1])
        )
      })
      .innerJoin('hyinf', 'hyinf.keycmobj', 'hykop.keycmobj')
      .whereIn('hyobj.keyhyobt', ['3', '5', '_1WP0JXVK8', '_1WP0KDMOO'])
      .whereNull('hyobj.makuldatum')
      .andWhere('hyobj.deletemark', '=', 0)
      .whereNull('hyobj.sistadeb')

    // Main Query
    const results = await db
      .from(parkingSpacesQuery.as('ps'))
      .select(
        'ps.rentalObjectCode',
        'ps.vehiclespacecode',
        'ps.vehiclespacecaption',
        'ps.companycode',
        'ps.companycaption',
        'ps.blockcode',
        'ps.blockcaption',
        'ps.vehiclespacetypecode',
        'ps.vehiclespacetypecaption',
        'ps.vehiclespacenumber',
        'ps.postaladdress',
        'ps.zipcode',
        'ps.city',
        'ps.scegcaption',
        'ps.scegcode',
        db.raw(`
          CASE
            WHEN rb.keycmobj IS NOT NULL THEN 'Has rental block: ' + rb.blocktype
            WHEN ac.keycmobj IS NOT NULL THEN 'Has active contract: ' + ac.contractid
            ELSE 'VACANT'
          END AS status
        `),
        'rb.blocktype',
        'rb.blockstartdate',
        'rb.blockenddate',
        'ac.contractid',
        'ac.fromdate as contractfromdate',
        'ac.lastdebitdate'
      )
      .leftJoin(activeRentalBlocksQuery.as('rb'), 'rb.keycmobj', 'ps.keycmobj')
      .leftJoin(activeContractsQuery.as('ac'), 'ac.keycmobj', 'ps.keycmobj')
      .where(function () {
        this.whereNull('rb.keycmobj').orWhere(
          'rb.blockenddate',
          '<=',
          db.fn.now()
        )
      })
      .whereNull('ac.keycmobj')
      .orderBy('ps.blockcode', 'ps.vehiclespacenumber')

    const listings: VacantParkingSpace[] = results.map((row) =>
      trimRow(transformFromXpandListing(row))
    )
    return { ok: true, data: listings }
  } catch (err) {
    logger.error(err, 'tenantLeaseAdapter.getAllAvailableParkingSpaces')
    return { ok: false, err }
  }
}

export { getAllVacantParkingSpaces, transformFromXpandListing, db }
