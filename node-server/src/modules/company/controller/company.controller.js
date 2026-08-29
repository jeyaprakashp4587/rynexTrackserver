import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  createCompanyProfile,
  getCompanyProfile,
} from "../services/company.service.js";

export const createCompany = async (req, res) => {
  try {
    await createCompanyProfile({
      companyName: req.body.companyName,
      address: req.body.address,
      GstNumber: req.body.GstNumber,
      ownerId: req.userId,
    });

    return successResponse({
      res,
      statusCode: 201,
      message: "Company created successfully",
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: error.message ? 400 : 500,
      message: error.message || "Failed to create company",
    });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    const company = await getCompanyProfile(req.userId);
    return successResponse({
      res,
      statusCode: 200,
      message: "Company retrieved successfully",
      data: company,
    });
  } catch (error) {
    return errorResponse({
      statusCode: error.message === "Company not found" ? 404 : 500,
      res,
      message: error.message || "Failed to retrieve company",
    });
  }
};
