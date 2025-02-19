/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.transaction(async (trx) => {
    await trx.raw(`
       ALTER TABLE application_profile_housing_reference
       DROP COLUMN
         lastAdminUpdatedBy,
         lastAdminUpdatedAt,
         lastApplicantUpdatedAt;
    `)

    await trx.raw(`
      ALTER TABLE application_profile_housing_reference
      ADD 
        reviewedAt datetimeoffset,
        reviewedBy nvarchar(36);
    `)

    await trx.raw(`
      ALTER TABLE application_profile
      ADD lastUpdatedAt datetimeoffset;
    `)
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.transaction(async (trx) => {
    await trx.raw(`
       ALTER TABLE application_profile_housing_reference
       ADD
         lastAdminUpdatedBy nvarchar(36),
         lastAdminUpdatedAt datetimeoffset,
         lastApplicantUpdatedAt datetimeoffset;
    `)

    await trx.raw(`
       UPDATE application_profile_housing_reference
       SET lastApplicantUpdatedAt = createdAt;
    `)

    await trx.raw(`
      ALTER TABLE application_profile_housing_reference
      DROP COLUMN
        reviewedAt,
        reviewedBy;
    `)

    await trx.raw(`
      ALTER TABLE application_profile
      DROP COLUMN lastUpdatedAt;
    `)
  })
}
