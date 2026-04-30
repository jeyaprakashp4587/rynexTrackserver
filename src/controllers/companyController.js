import { Company } from "../models/Company.js";

export const createCompany = async (req, res) => {
  try {
    const { companyName, address, GSTNumber } = req.body;
    const ownerId = req.userId;
    console.log("owner", ownerId, companyName, address, GSTNumber);

    const newCompany = await Company.create({
      companyName,
      owner: ownerId,
      address,
      GSTNumber,
    });
    res.status(201).json({ message: "Company created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create company" });
  }
};

export const getMyCompany = async (req, res) => {
  try {
    const ownerId = req.userId;
    const company = await Company.findOne({ owner: ownerId });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve company" });
  }
};
