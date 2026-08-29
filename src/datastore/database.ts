import {
  getRecordById,
  getRecords,
  getTechnologiesForRecord,
} from "./queries.js";

console.log("ALL RECORDS");

console.log(getRecords());

console.log("\nONE RECORD");

console.log(getRecordById("sandbox-datastore"));

console.log("\nTECHNOLOGIES");

console.log(getTechnologiesForRecord("sandbox-datastore"));
