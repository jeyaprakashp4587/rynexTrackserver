import { Company } from "../models/Company.js";
import { errorResponse, successResponse } from "../shared/utils/response.js";

export const createCompany = async (req, res) => {
  try {
    const { companyName, address, GstNumber } = req.body;
    const ownerId = req.userId;
    console.log("owner", ownerId, companyName, address, GstNumber);

    const newCompany = await Company.create({
      companyName,
      owner: ownerId,
      address,
      GSTNumber: GstNumber,
    });
    successResponse({
      statusCode: 201,
      res,
      message: "Company created successfully",
    });
  } catch (error) {
    return errorResponse({
      statusCode: 500,
      res,
      message: "Failed to create company",
    });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    const ownerId = req.userId;
    const company = await Company.findOne(
      { owner: ownerId },
      { drivers: 0, vehicles: 0 }
    );
    if (!company) {
      return errorResponse({
        statusCode: 404,
        res,
        message: "Company not found",
      });
    }
    successResponse({
      statusCode: 200,
      res,
      message: "Company retrieved successfully",
      data: company,
    });
  } catch (error) {
    return errorResponse({
      statusCode: 500,
      res,
      message: "Failed to retrieve company",
    });
  }
};
