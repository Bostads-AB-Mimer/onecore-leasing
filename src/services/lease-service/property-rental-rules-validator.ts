import { DetailedApplicant } from 'onecore-types'
import { getEstateCodeFromXpandByRentalObjectCode } from './adapters/xpand/estate-code-adapter'

const propertiesWithSpecificRentalRules = [
  {
    estateCode: '24104', //Sjöodjuret 2
  },
  {
    estateCode: '23002', //ROTORN 13
  },
  {
    estateCode: '23003', //ISOLATORN 14
  },
]

const doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules = (
  estateCode: string
) => {
  return propertiesWithSpecificRentalRules.some(
    (property) => estateCode == property.estateCode
  )
}

async function doesUserHaveHousingContractInSamePropertyAsListing(
  detailedApplicant: Pick<
    DetailedApplicant,
    'currentHousingContract' | 'upcomingHousingContract'
  >,
  listingEstateCode: string
): Promise<boolean> {
  let estateCodeOfCurrentHousingContract = undefined
  let estateCodeOfUpcomingHousingContract = undefined

  if (detailedApplicant.currentHousingContract) {
    estateCodeOfCurrentHousingContract =
      await getEstateCodeFromXpandByRentalObjectCode(
        detailedApplicant.currentHousingContract.rentalPropertyId
      )
  }

  if (detailedApplicant.upcomingHousingContract) {
    estateCodeOfUpcomingHousingContract =
      await getEstateCodeFromXpandByRentalObjectCode(
        detailedApplicant.upcomingHousingContract.rentalPropertyId
      )
  }

  const applicantHasCurrentHousingContractInProperty = !!(
    estateCodeOfCurrentHousingContract &&
    estateCodeOfCurrentHousingContract !== '' &&
    estateCodeOfCurrentHousingContract === listingEstateCode
  )

  const applicantHasUpcomingHousingContractInProperty = !!(
    estateCodeOfUpcomingHousingContract &&
    estateCodeOfUpcomingHousingContract !== '' &&
    estateCodeOfUpcomingHousingContract === listingEstateCode
  )

  return (
    applicantHasCurrentHousingContractInProperty ||
    applicantHasUpcomingHousingContractInProperty
  )
}

export {
  doesPropertyBelongingToParkingSpaceHaveSpecificRentalRules,
  doesUserHaveHousingContractInSamePropertyAsListing,
}
