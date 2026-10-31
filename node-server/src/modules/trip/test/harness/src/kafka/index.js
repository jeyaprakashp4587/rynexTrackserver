export const published = [];

let failures = 0;

export const failNext = (count) => {
  failures = count;
};

export const sendMessage = async (topic, message) => {
  if (failures > 0) {
    failures -= 1;
    throw new Error("broker unavailable");
  }

  published.push({ topic, message });
};
