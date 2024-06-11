import { getFromCore } from './common/core-adapter'
import Config from '../../../common/config'

const coreBaseUrl = Config.core.url

const getPropertyInfoFromCore = async (rentalObjectCode: string) => {
  return await getFromCore({
    url: `${coreBaseUrl}/propertyInfoFromXpand/${rentalObjectCode}`,
  })
}

export { getPropertyInfoFromCore }
