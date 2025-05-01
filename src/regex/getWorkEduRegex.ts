import educationPrograms from "../../data/education-programs.json";
import professions from "../../data/professions.json";
const educationProgramsSet = new Set(educationPrograms);
const professionsSet = new Set(professions);

const getWorkOrganizationRegex = () => {
  return new RegExp(
    /\b(?:[A-ZÅÄÖ][a-zåäöé]*\s)*(?:AB|HB|KB|Företag|Bolag|Industries|Group|Gruppen|Firma|Inc|Ltd|Corp|GmbH)\b/g
  );
};

const getEducationOrganizationRegex = () => {
  return new RegExp(
    /\b(?:[A-ZÅÄÖ][a-zåäöé]*\s)*(?:Universitet|Högskola(n?)|Gymnasium|Skola(n?)|Institut|Institutet)\b/gi
  );
};

const getEducationProgramRegex = () => {
  const listRegex = `\\b(${Array.from(educationProgramsSet).join("|")})\\b`;
  const dynamicRegex = "\\b\\p{L}{2,}(programmet|\\sutbildning)\\b";
  return new RegExp(`${listRegex}|${dynamicRegex}`, "giu");
};

const getWorkProfessionRegex = () => {
  return new RegExp(`\\b(${Array.from(professionsSet).join("|")})\\b`, "gi");
};

const getOrganizationNumber = () => {
  return new RegExp(/\b\d{6}-\d{4}\b/g);
};

export {
  getWorkOrganizationRegex,
  getEducationOrganizationRegex,
  getEducationProgramRegex,
  getWorkProfessionRegex,
  getOrganizationNumber,
};
