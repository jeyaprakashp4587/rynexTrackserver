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

  return createCompanyRecord({
    companyName,
    ownerId,
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
