import soapRequest from 'easy-soap-request'
import { XMLParser } from 'fast-xml-parser'
import createHttpError from 'http-errors'

import Config from '../../../common/config'

const createLease = async (
  fromDate: Date,
  rentalPropertyId: string,
  tenantCode: string,
  companyCode: string
) => {
  const base64credentials = Buffer.from(
    Config.xpandSoap.username + ':' + Config.xpandSoap.password
  ).toString('base64')

  const sampleHeaders = {
    'Content-Type': 'application/soap+xml;charset=UTF-8;',
    'user-agent': 'onecore-xpand-soap-adapter',
    Authorization: `Basic ${base64credentials}`,
  }

  const xml = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ser="http://incit.xpand.eu/service/" xmlns:inc="http://incit.xpand.eu/" xmlns:data="http://incit.xpand.eu/data/">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>http://incit.xpand.eu/service/CreateRentContract/CreateRentContract</wsa:Action><wsa:To>https://pdatest.mimer.nu:9055/Incit/Service/External/ServiceCatalogue/</wsa:To></soap:Header>
  <soap:Body>
     <ser:CreateRentContractRequest>
        <!--Optional:-->
        <inc:CompanyCode>${companyCode}</inc:CompanyCode>
        <!--Optional:-->
        <inc:ContractFromDate>${fromDate.toLocaleDateString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })}</inc:ContractFromDate>
        <!--Optional:<inc:ContractToDate></inc:ContractToDate> Måste ta bort den helt-->
        <!--Optional:-->
        <inc:MessageCulture>${
          Config.xpandSoap.messageCulture
        }</inc:MessageCulture>
        <!--Optional:-->
        <inc:MovingFromId/>
        <!--Optional:-->
        <inc:PreviousResidenceId/>
        <!--Optional:-->
        <inc:ReasonId/>
        <!--Optional:-->
        <inc:RentalObjectCode>${rentalPropertyId}</inc:RentalObjectCode>
        <!--Optional:-->
        <inc:RentalObjectId/>
        <!--Optional:-->
        <inc:Tenants>
           <!--Zero or more repetitions:-->
           <data:TenantCode>
              <!--Optional: <data:TenantCode>P174965</data:TenantCode> -->
              <data:TenantCode>${tenantCode}</data:TenantCode>
              <!--Optional:-->
              <data:TenantId/>
           </data:TenantCode>
        </inc:Tenants>
     </ser:CreateRentContractRequest>
  </soap:Body>
</soap:Envelope>`

  try {
    const { response } = await soapRequest({
      url: Config.xpandSoap.url,
      headers: sampleHeaders,
      xml: xml,
    })
    const { body } = response

    const parser = new XMLParser()
    const parsedResponse =
      parser.parse(body)['s:Envelope']['s:Body'].CreateNewEntityResult

    if (parsedResponse.Success === true) {
      return parsedResponse.ObjectDescription
    } else if (parsedResponse.Message == 'Hyresobjekt saknas.') {
      throw createHttpError(404, 'Parking space not found')
    }
    throw createHttpError(500, parsedResponse.Message)
    //TODO: handle more errors...
  } catch (error: unknown) {
    console.error(error)
    throw error
  }
}

export { createLease }