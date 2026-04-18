import { Company } from "../models/Company";

export const createCompany = async (req, res) => {
  try {
    const { companyName, ownerId, adress, GSTNumber } = req.body;
    const newCompany = new Company({
      companyName,
      owner: ownerId,
      adress,
      GSTNumber,
    });
    await newCompany.save();
    // Logic to create a company in the database
    res.status(201).json({ message: "Company created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create company" });
  }
};
