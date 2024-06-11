import { getFromCore } from './common/core-adapter'
import Config from '../../../common/config'

const coreBaseUrl = Config.core.url

//todo: update all references..
const getPropertyInfoFromCore = async (rentalObjectCode: string) => {
  console.log('calling getPropertyInfoFromCore')
  return await getFromCore({
    url: `${coreBaseUrl}/propertyInfoFromXpand/${rentalObjectCode}`,
  })
}

export { getPropertyInfoFromCore }
