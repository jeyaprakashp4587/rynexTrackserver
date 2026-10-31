export const deletedKeys = [];

let shouldFail = false;

export const failRedis = (value) => {
  shouldFail = value;
};

export const redis = {
  del: async (...keys) => {
    if (shouldFail) {
      throw new Error("redis unavailable");
    }

    deletedKeys.push(...keys);
  },
};
