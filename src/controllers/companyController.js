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
