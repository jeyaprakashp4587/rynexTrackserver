import {
  createCompanyRecord,
  findCompanyByOwner,
} from "../repositories/company.repository.js";

export const createCompanyProfile = async ({
  companyName,
  address,
  GstNumber,
  ownerId,
}) => {
  if (!companyName) {
    throw new Error("Company name is required");
  }

  if (!ownerId) {
    throw new Error("Owner is required");
  }

  return createCompanyRecord({
    companyName,
    owners: [ownerId],
    address,
    GSTNumber: GstNumber,
  });
};

export const getCompanyProfile = async (ownerId) => {
  const company = await findCompanyByOwner(ownerId);
  if (!company) {
    throw new Error("Company not found");
  }

  return company;
};
