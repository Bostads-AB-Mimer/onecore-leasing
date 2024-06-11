"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const onecore_utilities_1 = require("onecore-utilities");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const types_1 = require("./types");
const qs_1 = __importDefault(require("qs"));
const xpandUrl = process.env.XPAND__URL;
const tenantLeasesUrl = process.env.TENANTS_LEASES__URL;
const tenantsLeasesHeaders = {
    'Content-Type': 'application/json',
};
let accessToken = undefined;
const getAccessToken = async () => {
    const data = qs_1.default.stringify({
        grant_type: 'client_credentials',
        client_secret: process.env.XPAND__CLIENT_SECRET,
        client_id: process.env.XPAND__CLIENT_ID,
        scope: process.env.XPAND__SCOPE,
    });
    const config = {
        method: 'post',
        url: `https://login.microsoftonline.com/${process.env.XPAND__TENANT_ID}/oauth2/v2.0/token`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data,
    };
    const result = await (0, onecore_utilities_1.loggedAxios)(config);
    return result.data.access_token;
};
const createXpandHeaders = (accessToken) => {
    const xpandHeaders = {
        Authorization: 'Bearer ' + accessToken,
        'Ocp-Apim-Subscription-Key': process.env.XPAND__SUBSCRIPTION_KEY,
    };
    return xpandHeaders;
};
const getFromXpand = async (url) => {
    if (!accessToken) {
        accessToken = await getAccessToken();
    }
    try {
        return await onecore_utilities_1.loggedAxios.get(url, {
            headers: createXpandHeaders(accessToken ?? ''),
        });
    }
    catch (error) {
        const axiosErr = error;
        if (axiosErr.response?.status === 401) {
            accessToken = await getAccessToken();
            return await getFromXpand(url);
        }
        throw error;
    }
};
const syncContactToTenantsLeases = async (contact) => {
    const transformedContact = {
        contactId: contact.contactId === 'RENSAD_GDPR' // Temporary for mocked api
            ? 'P' + contact.contractId
            : contact.contactId,
        firstName: contact.firstname,
        lastName: contact.lastname,
        fullName: contact.fullname,
        type: contact.contractRelation,
        birthDate: contact.birthDate,
        mobilePhone: contact.phoneMobile,
        phoneNumber: contact.phoneHome,
        nationalRegistrationNumber: contact.socSecNo,
        leaseId: contact.contractId,
        lease: undefined,
        address: undefined,
        emailAddress: contact.email,
        lastUpdated: undefined,
    };
    const result = await onecore_utilities_1.loggedAxios.post(`${tenantLeasesUrl}/contacts`, transformedContact, {
        headers: tenantsLeasesHeaders,
    });
};
const syncContactsToTenantsLeases = async (contacts) => {
    const transformedContacts = contacts.map((contact) => {
        const transformedContact = {
            contactId: contact.contactId,
            firstName: contact.firstname,
            lastName: contact.lastname,
            fullName: contact.fullname,
            type: contact.contractRelation,
            birthDate: contact.birthDate,
            mobilePhone: contact.phoneMobile,
            phoneNumber: contact.phoneHome,
            nationalRegistrationNumber: contact.socSecNo,
            leaseId: contact.contractId,
            lease: undefined,
            address: undefined,
            emailAddress: contact.email,
            lastUpdated: undefined,
        };
        return transformedContact;
    });
    await onecore_utilities_1.loggedAxios.post(`${tenantLeasesUrl}/contacts`, transformedContacts, {
        headers: tenantsLeasesHeaders,
    });
};
const syncContractsToTenantsLeases = async (contracts) => {
    const transformedContracts = contracts.map((contract) => {
        const transformedContract = {
            leaseId: contract.contractId,
            leaseNumber: '',
            leaseStartDate: contract.fromDate,
            leaseEndDate: contract.toDate,
            status: types_1.LeaseStatus.Active,
            tenantContactIds: undefined,
            tenants: undefined,
            type: contract.contractType,
            rentalPropertyId: contract.rentalPropertyId,
            rentalProperty: undefined,
            lastUpdated: undefined,
            rentInfo: undefined,
        };
        return transformedContract;
    });
    await onecore_utilities_1.loggedAxios.post(`${tenantLeasesUrl}/leases`, transformedContracts, {
        headers: tenantsLeasesHeaders,
    });
};
const syncContractToTenantsLeases = async (contract) => {
    const transformedContract = {
        leaseId: contract.contractId,
        leaseNumber: '',
        leaseStartDate: contract.fromDate,
        leaseEndDate: contract.toDate,
        status: types_1.LeaseStatus.Active,
        tenantContactIds: undefined,
        tenants: undefined,
        type: contract.contractType,
        rentalPropertyId: contract.rentalPropertyId,
        rentalProperty: undefined,
        lastUpdated: undefined,
        rentInfo: undefined,
    };
    const result = onecore_utilities_1.loggedAxios.post(`${tenantLeasesUrl}/leases`, transformedContract, {
        headers: tenantsLeasesHeaders,
    });
    return result;
};
const syncContacts = async () => {
    const pageSize = 1000;
    let currentPage = 1;
    let hasNext = true;
    while (hasNext) {
        const xpandContacts = await getFromXpand(`${xpandUrl}/Contact?page_number=${currentPage++}&page_size=${pageSize}`);
        console.log(xpandContacts.data.currentPage, 'of', xpandContacts.data.totalPages);
        await syncContactsToTenantsLeases(xpandContacts.data.items);
        hasNext = xpandContacts.data.hasNext;
    }
};
const syncContracts = async () => {
    const pageSize = 1000;
    let currentPage = 1;
    let hasNext = true;
    while (hasNext) {
        const xpandContracts = await getFromXpand(`${xpandUrl}/Contract?page_number=${currentPage++}&page_size=${pageSize}&activeContracts=true`);
        console.log(xpandContracts.data.currentPage, 'of', xpandContracts.data.totalPages);
        await syncContractsToTenantsLeases(xpandContracts.data.items);
        hasNext = xpandContracts.data.hasNext;
    }
};
const runSync = async () => {
    await syncContacts();
    await syncContracts();
};
runSync();
