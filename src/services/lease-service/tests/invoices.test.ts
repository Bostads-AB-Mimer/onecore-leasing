import { getInvoicesByContactCode, getUnpaidInvoicesByContactCode } from '../adapters/invoices-adapter'

//todo: add a test that has an invoice the is found in both paid and unpaid invoices E.G. handled by debt collector
// todo: create 2 endpoint tests ?

//todo: can we pass mock data in init in each test? Mock data should differ between tests for better coverage
jest.mock('knex', () => () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((callback: any) => callback([
    {
      invoiceId: "552303315030452",
      leaseId: "705-025-03-0205/01",
      amount: 7687.77,
      fromDate: new Date("2023-03-01T00:00:00.000Z"),
      toDate: new Date("2023-03-31T00:00:00.000Z"),
      invoiceDate: new Date("2023-02-15T00:00:00.000Z"),
      expirationDate: new Date("2023-02-28T00:00:00.000Z"),
      debitStatus: 5,
      paymentStatus: 1,
      transactionTypeName: "HYRA"
    },
    //paid invoice
    {
      invoiceId: "552211309521354",
      leaseId: "705-025-03-0205/01",
      amount: 7028.83,
      fromDate: new Date("2022-11-01T00:00:00.000Z"),
      toDate: new Date("2022-11-30T00:00:00.000Z"),
      invoiceDate: new Date("2022-10-13T00:00:00.000Z"),
      expirationDate: new Date("2022-10-31T00:00:00.000Z"),
      debitStatus: 5,
      paymentStatus: 3,
      transactionTypeName: "HYRA"
    },
  ])),
}));

// describe ('GET /invoices ', () => {
//   it('responds with an array of invoices', async () => {
//     const getInvoicesSpy = jest
//       .spyOn(invoicesAdapter, 'getInvoicesByContactCode')
//       .mockResolvedValue(invoiceMock)
//
//     //todo: do we need to the pass the param?
//     const res = await request(app.callback()).get('/contact/invoices/contactCode/')
//     expect(res.status).toBe(200)
//     expect(res.body.data).toBeInstanceOf(Array)
//     expect(getInvoicesSpy).toHaveBeenCalled()
//     expect(res.body.data.length).toBe(2)
//   })
// }


//todo: flesh out more
describe('getInvoicesByContactCode', () => {
  it('should return unpaid and paid invoices for a contact', async () => {
    const contactKey = 'someContactKey';
    const result = await getInvoicesByContactCode(contactKey);

    console.log('result', result);

    expect(result?.paidInvoices).toHaveLength(1); // Passes
    expect(result?.unpaidInvoices).toHaveLength(1); // Passes
  });
});
