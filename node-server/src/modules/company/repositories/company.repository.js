import { Company } from "../models/company.model.js";

export const createCompanyRecord = async ({
  companyName,
  ownerId,
  address,
  GSTNumber,
}) => {
  return Company.create({
    companyName,
    owner: ownerId,
    address,
    GSTNumber,
  });
};

export const findCompanyByOwner = async (ownerId) => {
  return Company.findOne({ owner: ownerId }, { drivers: 0, vehicles: 0 });
};
