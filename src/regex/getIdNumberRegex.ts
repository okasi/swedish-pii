const getMalePersonnummerRegex = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Generate year pattern ensuring valid years up to the current year
  const yearPattern = `(?:19[0-9]{2}|20[0-${currentYear % 100}])`;
  const shortYearPattern = `[0-9]{2}`;

  const monthPattern = `(?:0[1-9]|1[0-2])`; // Match 01-12
  const dayPattern = `(?:0[1-9]|[12][0-9]|3[01])`; // Match 01-31

  const datePattern = `${yearPattern}${monthPattern}${dayPattern}`;
  const shortDatePattern = `${shortYearPattern}${monthPattern}${dayPattern}`;

  // The third digit of the last four digits must be odd for males
  const malePersonnummerPattern = `\\b(${datePattern}|${shortDatePattern})[\\-+](\\d{2}[13579]\\d)\\b`;

  return new RegExp(malePersonnummerPattern, "g");
};

const getFemalePersonnummerRegex = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // Generate year pattern ensuring valid years up to the current year
  const yearPattern = `(?:19[0-9]{2}|20[0-${currentYear % 100}])`;
  const shortYearPattern = `[0-9]{2}`;

  const monthPattern = `(?:0[1-9]|1[0-2])`; // Match 01-12
  const dayPattern = `(?:0[1-9]|[12][0-9]|3[01])`; // Match 01-31

  const datePattern = `${yearPattern}${monthPattern}${dayPattern}`;
  const shortDatePattern = `${shortYearPattern}${monthPattern}${dayPattern}`;

  // The third digit of the last four digits must be even for females
  const femalePersonnummerPattern = `\\b(${datePattern}|${shortDatePattern})[\\-+](\\d{2}[02468]\\d)\\b`;

  return new RegExp(femalePersonnummerPattern, "g");
};

const getMaleSamordningsnummerRegex = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const yearPattern = `(?:19[0-9]{2}|20[0-${currentYear % 100}])`;
  const shortYearPattern = `[0-9]{2}`;

  const monthPattern = `(?:0[1-9]|1[0-2])`;
  const dayPattern = `(?:6[1-9]|[78][0-9]|9[01])`; // Match 61-91 (valid day + 60)

  const datePattern = `${yearPattern}${monthPattern}${dayPattern}`;
  const shortDatePattern = `${shortYearPattern}${monthPattern}${dayPattern}`;

  // The third digit of the last four digits must be odd for males
  const maleSamordningsnummerPattern = `\\b(${datePattern}|${shortDatePattern})[\\-+](\\d{2}[13579]\\d)\\b`;

  return new RegExp(maleSamordningsnummerPattern, "g");
};

const getFemaleSamordningsnummerRegex = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const yearPattern = `(?:19[0-9]{2}|20[0-${currentYear % 100}])`;
  const shortYearPattern = `[0-9]{2}`;

  const monthPattern = `(?:0[1-9]|1[0-2])`;
  const dayPattern = `(?:6[1-9]|[78][0-9]|9[01])`; // Match 61-91 (valid day + 60)

  const datePattern = `${yearPattern}${monthPattern}${dayPattern}`;
  const shortDatePattern = `${shortYearPattern}${monthPattern}${dayPattern}`;

  // The third digit of the last four digits must be even for females
  const femaleSamordningsnummerPattern = `\\b(${datePattern}|${shortDatePattern})[\\-+](\\d{2}[02468]\\d)\\b`;

  return new RegExp(femaleSamordningsnummerPattern, "g");
};

export {
  getMalePersonnummerRegex, 
  getFemalePersonnummerRegex,
  getMaleSamordningsnummerRegex,
  getFemaleSamordningsnummerRegex,
};


