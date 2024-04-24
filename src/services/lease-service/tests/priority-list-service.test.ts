//getDetailedApplicantInformation:
//----------------
//should handle not found applicant
//should handle not found waitingList
//should handle empty leases - very unlikely case maybe skip?
//final happy path: should return applicant with required fields

//parseWaitingList:
//----------------
//should handle if no waitingListTypeCaption matches internal parking space
//should parse waitingListTypeCaption successfully for internal parking space


//todo: below is mock data for waiting list times
// [
//   {
//     applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//     contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 210,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2023-09-26T22:00:00.000Z,
//   waitingListTypeCaption: 'Bostad'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 210,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2023-09-26T22:00:00.000Z,
//   waitingListTypeCaption: 'Nyproduktion'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 210,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2023-09-26T22:00:00.000Z,
//   waitingListTypeCaption: 'Ungdom'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 210,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2023-09-26T22:00:00.000Z,
//   waitingListTypeCaption: 'Kooperativ'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 1752,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2019-07-08T08:59:15.983Z,
//   waitingListTypeCaption: 'Bilplats (extern)'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 1752,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2019-07-08T08:59:15.983Z,
//   waitingListTypeCaption: 'Bilplats (intern)'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 1859,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2019-03-22T13:15:13.617Z,
//   waitingListTypeCaption: 'Förråd (extern)'
// },
// {
//   applicantCaption: 'Sökande Fiktiv',
//     contactCode: 'P145241',
//   contractFromApartment: 2023-12-31T23:00:00.000Z,
//   queuePoints: 1859,
//   queuePointsSocialConnection: 0,
//   waitingListFrom: 2019-03-22T13:15:13.617Z,
//   waitingListTypeCaption: 'Förråd (intern)'
// }
// ]
