import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync("data/sandbox.db");

/*
 * Return every Sandbox record.
 */
export function getRecords() {
  return database
    .prepare(
      `
      SELECT *
      FROM records
      ORDER BY sort_order, title
    `,
    )
    .all();
}

/*
 * Find one Sandbox record by its ID.
 *
 * The ? is a SQL parameter placeholder.
 * The ID value is supplied separately with .get(id).
 */
export function getRecordById(id: string) {
  return database
    .prepare(
      `
      SELECT *
      FROM records
      WHERE id = ?
    `,
    )
    .get(id);
}

/*
 * Return all technologies related to one record.
 *
 * This uses the record_technologies join table
 * to connect records and technologies.
 */
export function getTechnologiesForRecord(recordId: string) {
  return database
    .prepare(
      `
      SELECT
        technologies.id,
        technologies.name,
        technologies.type,
        record_technologies.role
      FROM technologies

      JOIN record_technologies
        ON technologies.id =
           record_technologies.technology_id

      WHERE record_technologies.record_id = ?

      ORDER BY
        record_technologies.sort_order,
        technologies.name
    `,
    )
    .all(recordId);
}
