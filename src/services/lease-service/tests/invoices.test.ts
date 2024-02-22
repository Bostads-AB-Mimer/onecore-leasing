import { getInvoicesByContactCode, getUnpaidInvoicesByContactCode } from '../adapters/invoices-adapter'

//todo: can we pass unique mock data for specific tests? Mock data should differ between tests for better coverage
//todo: the best approach would be to wrap the knex mock in a function that takes the mock data as an argument
jest.mock('knex', () => () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((callback: any) => callback([
    //unpaid invoice
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

//todo: add endpoint tests

describe('getInvoicesByContactCode', () => {
  it('should return unpaid and paid invoices for a contact', async () => {
    const result = await getInvoicesByContactCode('contactKey');

    //todo: add more asserts
    expect(result).toBeDefined();
    expect(result?.paidInvoices).toHaveLength(1); // Passes
    expect(result?.unpaidInvoices).toHaveLength(1); // Passes
  });

  //todo: add a test that has an invoice that is found in both paid and unpaid invoices E.G. handled by debt collector
  //todo: the invoice handled by debt collector should be found in unpaid invoices in the result
});

describe('getUnpaidInvoicesByContactCode', () => {
  //todo: add tests
});
