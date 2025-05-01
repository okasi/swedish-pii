// TODO: https://stripe.com/en-se/resources/more/how-to-use-the-luhn-algorithm-a-guide-in-applications-for-businesses

// Matches a bank account number: 4 digits, optional '<', 'l', or 'i', 2 digits, optional '<', 'l', or 'i', then 4 digits (e.g., 1234<12<1234)
const getBankNumberRegex = () => {
  return new RegExp(/\b\d{4}[<li>]?\d{2}[<li>]?\d{4}\b/g);
};

// Matches an IBAN: 2 uppercase letters (country), 2 digits (check), 1-7 groups of 4 alphanumeric (optionally spaced), optional 1-2 alphanumeric at end (e.g., GB29 NWBK 6016 1331 9268 19)
const getIbanCodeRegex = () => {
  return new RegExp(
    /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){1,7}(?:\s?[A-Z0-9]{1,2})?\b/g
  );
};

// Matches a BIC/SWIFT code: 4 uppercase letters (bank), 2 uppercase letters (country), 2 alphanumeric (location), optional 3 alphanumeric (branch) (e.g., DEUTDEFF500)
const getBicCodeRegex = () => {
  return new RegExp(/\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g);
};

// Matches a MasterCard number: starts with 51-55 or 2221-2720, 16 digits in total, optional spaces or hyphens between groups (e.g., 5555-4444-3333-1111)
const getMasterCardCreditCardRegex = () => {
  return new RegExp(
    /\b(5[1-5]\d{2}|22[2-9]\d|2[3-7]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g
  );
};

// Matches a Visa card number: starts with 4, followed by 12-15 digits, optional spaces or hyphens between groups (e.g., 4111 1111 1111 1111)
const getVisaCreditCardRegex = () => {
  return new RegExp(/\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g);
};

// Matches an American Express card: starts with 34 or 37, 15 digits in total, optional spaces or hyphens between groups (e.g., 3714-496353-98431)
const getAmexCreditCardRegex = () => {
  return new RegExp(/\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/g);
};

export {
  getBankNumberRegex,
  getIbanCodeRegex,
  getBicCodeRegex,
  getMasterCardCreditCardRegex,
  getVisaCreditCardRegex,
  getAmexCreditCardRegex,
};
