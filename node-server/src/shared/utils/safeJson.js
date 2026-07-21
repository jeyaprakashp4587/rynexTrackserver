export const safeJsonParse = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};
k;
