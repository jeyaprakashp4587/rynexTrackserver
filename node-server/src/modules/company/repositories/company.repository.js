import { Company } from "../models/company.model.js";
import { companyCache } from "../cache/company.cache.js";

export const createCompanyRecord = async ({
  companyName,
  owners,
  address,
  GSTNumber,
}) => {
  return Company.create({
    companyName,
    owners,
    address,
    GSTNumber,
  });
};

export const findCompanyByOwner = async (ownerId) => {
  return companyCache.getByOwner(
    ownerId,
    () =>
      Company.findOne({ owners: ownerId }, { drivers: 0, vehicles: 0 }).lean(),
    3600
  );
};
