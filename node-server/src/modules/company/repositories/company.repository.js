import { Company } from "../models/company.model.js";
import { companyCache } from "../cache/company.cache.js";

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
  return companyCache.getByOwner(
    ownerId,
    () =>
      Company.findOne({ owner: ownerId }, { drivers: 0, vehicles: 0 }).lean(),
    3600
  );
};
