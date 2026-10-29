import mongoose from "mongoose";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

export const isObjectIdLike = (value) =>
  value instanceof mongoose.Types.ObjectId ||
  (typeof value === "string" && OBJECT_ID_PATTERN.test(value));

export const toObjectId = (value, errorMessage) => {
  if (!isObjectIdLike(value)) {
    throw new Error(errorMessage);
  }

  return new mongoose.Types.ObjectId(value);
};

export const toOptionalObjectId = (value, errorMessage) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return toObjectId(value, errorMessage);
};

export const newObjectId = () => new mongoose.Types.ObjectId();
