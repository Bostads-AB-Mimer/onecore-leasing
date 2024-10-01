/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.raw(`
    -- TODO: Migrate existing data?

    CREATE TABLE offer_applicant (
      id int NOT NULL PRIMARY KEY IDENTITY(1,1),
      listingId int NOT NULL,
      offerId int NOT null,
      applicantId int NOT NULL,
      applicantStatus int NOT NULL,
      applicantApplicationType text NOT NULL,
      applicantQueuePoints int NOT NULL,
      applicantAddress text NOT NULL,
      applicantHasParkingSpace bit NOT NULL,
      applicantHousingLeaseStatus int NOT NULL,

      -- TODO: Does this need to be nullable?
      applicantPriority int,

      sortOrder int NOT NULL,
      createdAt datetime NOT NULL DEFAULT GETUTCDATE(),
      FOREIGN KEY (listingId) REFERENCES listing(id),
      FOREIGN KEY (applicantId) REFERENCES applicant(id),
      FOREIGN KEY (offerId) REFERENCES offer(id)

    );

    CREATE UNIQUE INDEX unique_offered_applicant_per_listing 
    ON offer_applicant (listingId, applicantStatus)
    WHERE applicantStatus = 6; -- ApplicantStatus.Offered
  `)
}
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.raw(`
    DROP TABLE offer_applicant;
  `)
}
