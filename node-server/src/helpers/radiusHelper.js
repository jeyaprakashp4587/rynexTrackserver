export const toMeters = (km) => {
  const parsed = Number(km);

  if (!km || isNaN(parsed) || parsed <= 0) {
    return 10000; // default 10km
  }

  // safety cap (avoid abuse)
  if (parsed > 200) {
    return 200 * 1000;
  }

  return parsed * 1000;
};

export const toKm = (meters) => {
  const parsed = Number(meters);

  if (!meters || isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed / 1000;
};
