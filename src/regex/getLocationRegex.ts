import counties from "../../data/raw/counties.json";
import municipalities from "../../data/raw/municipalities.json";
const countiesSet = new Set(counties);
const municipalitiesSet = new Set(municipalities);

const getStreetAddressRegex = () => {
  return new RegExp(
    "\\b" + // Word boundary at the start
      "[A-ZÅÄÖ]" + // Ensure the first character is a capital letter
      "[a-zåäöéé]+" + // Match the rest of the first word
      "(?:-[a-zA-ZåäöÅÄÖéÉ]+)?\\s?" + // Optionally match a hyphenated part
      "(?:[A-ZÅÄÖ][a-zåäöéÉ]+(?:-[a-zA-ZåäöÅÄÖéÉ]+)?\\s?)?" + // Optionally match the second word starting with a capital letter
      "(?:[A-ZÅÄÖ][a-zåäöéÉ]+(?:-[a-zA-ZåäöÅÄÖéÉ]+)?\\s?)?" + // Optionally match the third word starting with a capital letter
      "(?:" +
      "gatan|vägen|gränd|backe|torg|allé|väg|" +
      "gata|lund|stig|plats|bro|park|strand|" +
      "kvarter|terrass|berg|slätt|hamn|äng" +
      ")" +
      "(?:\\s\\d{1,4})?" + // Optional space and number (up to 4 digits)
      "\\b",
    "g" // Word boundary at the end, global (case sensitivity handled by specifying capital letters explicitly)
  );
};

const getPostalCodeRegex = () => {
  return new RegExp(
    "\\b\\d{3}\\s?\\d{2}\\b", // Match the postal code pattern
    "g" // Global flag to match all occurrences in the text
  );
};

const getMunicipalityRegex = () => {
  return new RegExp(`\\b(${Array.from(municipalitiesSet).join("|")})\\b`, "gi");
};

const getCountyRegex = () => {
  return new RegExp(`\\b(${Array.from(countiesSet).join("|")})\\b`, "gi");
};

export {
  getStreetAddressRegex,
  getPostalCodeRegex,
  getMunicipalityRegex,
  getCountyRegex,
};
