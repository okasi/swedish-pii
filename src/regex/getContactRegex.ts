const getPhoneNumberRegex = () => {
  return new RegExp(/\b\d{2,4}[<li>]?\d{3,4}[<li>]?\d{4}\b/g); // /^(\+?46|0)[\s\-]?7[\s\-]?[02369]([\s\-]?\d){7}$/
};

const getEmailAddressRegex = () => {
  return new RegExp(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g);
};

const getSocialMedia = () => {
  return new RegExp(
    /\b(?:@[A-Za-z0-9_]{1,15}|http(?:s)?:\/\/(?:www\.)?[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:\/[A-Za-z0-9_]{1,15})?)\b/g
  );
};

export { getPhoneNumberRegex, getEmailAddressRegex, getSocialMedia };
