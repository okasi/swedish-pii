const getLicensePlateRegex = () => {
  return new RegExp(/\b[A-Z]{3}\s?\d{2,3}[A-Z]{0,2}\b/g);
};

const getIpAddressRegex = () => {
  return new RegExp(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g);
};

const getMacAddressRegex = () => {
  return new RegExp(/\b([A-Fa-f0-9]{2}[:-]){5}[A-Fa-f0-9]{2}\b/g);
};

const getDateRegex = () => {
  return new RegExp(/\b\d{4}[-\/]\d{2}[-\/]\d{2}\b/g);
};

const getTimeRegex = () => {
  return new RegExp(/\b\d{2}:\d{2}(:\d{2})?\b/g);
};

export {
  getLicensePlateRegex,
  getIpAddressRegex,
  getMacAddressRegex,
  getDateRegex,
  getTimeRegex,
};
