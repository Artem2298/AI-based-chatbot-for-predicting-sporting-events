const getEnvVar = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env variable: ${key}`);
  }
  return value;
};

// export const API_KEY = getEnvVar('API_FOOTBALL_KEY');
export const PORT = getEnvVar('PORT');
export const API_SPORTMONKS = getEnvVar('API_SPORTMONKS');
