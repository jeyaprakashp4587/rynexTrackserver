import { User } from "../models/user.model.js";

export const findUserByMobileNumber = async (mobileNumber) => {
  return User.findOne({ MobileNumber: mobileNumber });
};

export const findUserById = async (userId) => {
  return User.findById(userId, { password: 0 });
};

export const createUser = async ({ MobileNumber, password, role, Name }) => {
  return User.create({
    MobileNumber,
    password,
    role,
    Name,
  });
};

export const userExists = async (mobileNumber) => {
  return User.exists({ MobileNumber: mobileNumber });
};
