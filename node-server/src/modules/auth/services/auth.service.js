import bcrypt from "bcryptjs";
import {
  createAccessToken,
  createRefreshToken,
} from "../../../middlewares/JWT.js";
import {
  createUser,
  findUserById,
  findUserByMobileNumber,
  userExists,
} from "../repositories/auth.repository.js";

export const registerUser = async ({ MobileNumber, password, role, Name }) => {
  if (!MobileNumber || !password) {
    throw new Error("Mobile number and password are required.");
  }

  const existingUser = await userExists(MobileNumber);
  if (existingUser) {
    throw new Error("Mobile number already registered");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUser = await createUser({
    MobileNumber,
    password: hashedPassword,
    role,
    Name,
  });

  const accessToken = await createAccessToken(newUser);
  const refreshToken = await createRefreshToken(newUser);

  return {
    user: {
      id: newUser._id,
      MobileNumber: newUser.MobileNumber,
      role: newUser.role,
    },
    tokens: { accessToken, refreshToken },
  };
};

export const loginUser = async ({ MobileNumber, password }) => {
  if (!MobileNumber || !password) {
    throw new Error("Mobile number and password are required.");
  }

  const existingUser = await findUserByMobileNumber(MobileNumber);
  if (!existingUser) {
    throw new Error("Mobile number or password is incorrect.");
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    existingUser.password
  );
  if (!isPasswordCorrect) {
    throw new Error("Mobile number or password is incorrect.");
  }

  const userData = existingUser.toObject();
  delete userData.password;

  const accessToken = await createAccessToken(userData);
  const refreshToken = await createRefreshToken(userData);

  return {
    user: userData,
    tokens: { accessToken, refreshToken },
  };
};

export const getCurrentUserProfile = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const accessToken = await createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  return {
    user,
    tokens: { accessToken, refreshToken },
  };
};
