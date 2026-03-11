import { Counter } from "../models/counter.Model.js";

export const getNextInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: `invoice_${currentYear}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(7, "0");

  return `UPAVP/${currentYear}/${padded}`;
};


export const getNextApplicationNumber = async () => {
  const currentYear = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { name: `application_${currentYear}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const padded = String(counter.seq).padStart(7, "0");

  // GOVT STYLE FORMAT
  return `UPAVP/${currentYear}/${padded}`;
};