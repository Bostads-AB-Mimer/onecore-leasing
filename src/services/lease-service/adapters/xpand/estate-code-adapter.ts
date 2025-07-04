import { xpandDb } from './xpandDb'

// This adapter is a workaround to get the estate code of a rental object.
// The estate code is needed to be able to validate, according to, property rental rules
// that an applicant cannot rent more than 1 parking spaces in each property.
//
// If the applicant had an existing parking space contract in the same property
// then the only option is to replace to existing contract, if the applicant would get
// an offer for the parking space.
//
// Ideally we need to estate code on these entities to be able to do the validation:
// - listing
// - detailedApplicant.currentHousingContract
// - detailedApplicant.currentHousingContract
// - detailedApplicant.parkingSpaceContracts
// Where the tre latter are "leases" in onecore. E.G. we need estateCode in the leases.

// The naive solution would be to call property-management, via core, to get the estate code.
// That is not viable due to our architecture since it would create a circular call chain
// since the initial call from outside would result in core -> leasing -> core -> property management

const getEstateCodeFromXpandByRentalObjectCode = async (
  rentalObjectCode: string
): Promise<{ estateCode: string; type: string } | undefined> => {
  const [row] = await xpandDb('cmobj')
    .select('babuf.fstcode as estateCode', 'cmobt.keycmobt as type')
    .innerJoin('cmobt', 'cmobj.keycmobt', 'cmobt.keycmobt')
    .innerJoin('hyinf', 'cmobj.keycmobj', 'hyinf.keycmobj')
    .innerJoin('babuf', 'cmobj.keycmobj', 'babuf.keycmobj')
    .where('hyinf.hyresid', rentalObjectCode)

  if (!row) {
    return undefined
  }

  return { estateCode: row.estateCode, type: row.type.trim() }
}

export { getEstateCodeFromXpandByRentalObjectCode }
