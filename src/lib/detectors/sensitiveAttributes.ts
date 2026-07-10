import { regexDetector, termListRegex, wordBounded } from "../internal/regex";
import type { Detector } from "../types";

// "Gift" (Swedish: married / English: a present) and "Single" (marital
// status / "single sign-on") are handled by maritalStatusAmbiguous below.
const MARITAL_STATUS_TERMS = [
  // English
  "Unmarried", "Married", "Divorced", "Widowed", "Engaged",
  "Separated", "Cohabiting", "In a Relationship", "Registered partner",
  // Swedish
  "Ogift", "Skild", "Änka", "Änkling", "Förlovad", "Separerad",
  "Sambo", "I ett Förhållande", "Registrerad partner",
];

const GENETIC_SEX_TERMS = [
  // English — the bare term "Man" is deliberately absent: it is also the
  // most common Swedish indefinite pronoun ("man kan säga…"), and the
  // case-insensitive match would flag virtually all Swedish prose.
  "Male", "Female", "Woman", "Boy", "Girl", "Masculine", "Feminine",
  "Hermaphrodite", "Intersex",
  // Swedish
  "Hane", "Hona", "Manlig", "Kvinna", "Pojke", "Flicka", "Maskulin",
  "Feminin", "Hermafrodit", "Intersexuell",
];

const DISABILITY_TERMS = [
  // Swedish
  "Rörelsehinder", "Synskada", "Synskadad", "Hörselskada", "Hörselskadad",
  "Hörselnedsättning", "Döv", "Dövhet", "Blind", "Blindhet",
  "Utvecklingsstörning", "Autism", "ADHD", "Dyslexi",
  "Psykisk Funktionsnedsättning", "Intellektuell Funktionsnedsättning",
  "CP-Skada", "Epilepsi", "Multipel Skleros", "Cerebral Pares", "Asperger",
  "Downsyndrom", "Nedsatt Hörsel", "Nedsatt Syn", "Funktionsnedsättning",
  "Funktionshinder", "Rullstolsburen", "Handikapp", "Handikappad",
  // English
  "Physical Disability", "Visual Impairment", "Hearing Impairment", "Deaf",
  "Deafness", "Blindness", "Intellectual Disability", "Dyslexia",
  "Mental Disability", "Cognitive Disability", "Cerebral Palsy", "Epilepsy",
  "Multiple Sclerosis", "Down Syndrome", "Hearing Loss", "Low Vision",
  "Disability", "Impairment", "Wheelchair User", "Handicapped",
];

const RELIGION_TERMS = [
  // Swedish
  "Kristen", "Muslim", "Jude", "Judisk", "Hindu", "Buddhist", "Ateist",
  "Agnostiker", "Sikh", "Katolik", "Protestant", "Ortodox", "Mormon",
  "Hedning", "Shinto", "Zoroastrier", "Kristendom", "Islam", "Judendom",
  "Hinduism", "Buddhism", "Sikhism", "Shintoism", "Zoroastrism",
  "Svenska kyrkan", "Lutheran", "Lutersk", "Luthersk",
  // English
  "Christian", "Jew", "Jewish", "Atheist", "Agnostic", "Catholic",
  "Orthodox", "Pagan", "Zoroastrian", "Christianity", "Judaism",
  "Zoroastrianism",
];

const POLITICAL_IDEOLOGY_TERMS = [
  // Swedish
  "Liberal", "Konservativ", "Socialdemokrat", "Social demokrat", "Socialist",
  "Progressiv", "Nationalist", "Populist", "Libertarian", "Centrist",
  "Miljövän", "Kapitalist", "Kommunist", "Fascist", "Anarkist",
  // English
  "Conservative", "Social Democrat", "Progressive", "Environmentalist",
  "Capitalist", "Communist", "Anarchist",
];

export const maritalStatus: Detector = regexDetector("MARITAL_STATUS", () =>
  termListRegex(MARITAL_STATUS_TERMS)
);

/**
 * Marital terms that collide with everyday words:
 * - "gift" is Swedish for married but also the English noun — skip it
 *   after an English determiner/adjective ("a gift", "the perfect gift");
 * - "single" is a marital status but also a technical adjective — skip
 *   compounds like "single sign-on" or "single-page".
 */
export const maritalStatusAmbiguous: Detector = regexDetector(
  "MARITAL_STATUS",
  () =>
    new RegExp(
      "(?<!(?:\\ba|\\bthe|\\bmy|\\byour|\\bhis|\\bher|\\bthis|\\bthat|\\bevery|\\bnice|\\bperfect|\\bgreat|\\bbirthday|\\bchristmas|\\bwedding)\\s)" +
        wordBounded("gift") +
        "|" +
        wordBounded("single") +
        "(?![-–]|\\s(?:sign|click|use|user|room|bed|page|source|thread|core|player|mode|point|step|file|item|value|line|malt|cell|digit))",
      "giu"
    )
);

export const geneticSex: Detector = regexDetector("GENETIC_SEX", () =>
  termListRegex(GENETIC_SEX_TERMS)
);

export const disability: Detector = regexDetector("DISABILITY", () =>
  termListRegex(DISABILITY_TERMS)
);

export const religion: Detector = regexDetector("RELIGION", () =>
  termListRegex(RELIGION_TERMS)
);

/**
 * Sexual orientation: fixed terms plus productive suffix families
 * (…sexual/…sexuell, …romantic/…romantisk, and so on).
 */
export const sexualOrientation: Detector = regexDetector(
  "SEXUAL_ORIENTATION",
  () =>
    new RegExp(
      wordBounded(
        [
          "Queer", "Questioning", "Bicurious", "Straight", "Gay", "Lesbian",
          "Two-Spirit", "Bög", "Lesbisk", "Tvåkönad",
          "[\\p{L}-]+sexual", "[\\p{L}-]+sexuality", "[\\p{L}-]+romantic",
          "[\\p{L}-]+platonic", "[\\p{L}-]+flexible",
          "[\\p{L}-]+sexuell", "[\\p{L}-]+sexualitet", "[\\p{L}-]+romantisk",
          "[\\p{L}-]+platonisk", "[\\p{L}-]+flexibel",
        ].join("|")
      ),
      "giu"
    )
);

const ETHNICITY_TERMS_SV = [
  "Afroamerikan", "Asiat", "Asiatisk", "Kaukasisk", "Hispanisk",
  "Latinamerikansk", "Ursprungsamerikan", "Stillahavsöbor", "Mellanöstern",
  "Arabisk", "Judisk", "Ursprungsbefolkning", "Europeisk",
];

const ETHNICITY_TERMS_EN = [
  "African", "African American", "Asian", "Caucasian", "Caucasoid",
  "Hispanic", "Latino", "Latina", "Native American", "Pacific Islander",
  "Middle Eastern", "Arab", "Jewish", "Indigenous", "European",
];

const NATIONALITY_TERMS = [
  "Afghan", "Afghansk", "Albanian", "Albansk", "Algerian", "Algerisk",
  "American", "Amerikan", "Amerikansk", "Andorran", "Angolan", "Angolansk",
  "Argentinian", "Argentinsk", "Armenian", "Armenisk", "Australian",
  "Australisk", "Austrian", "Österrikisk", "Azerbaijani", "Azerisk",
  "Bahamian", "Bahamisk", "Bahraini", "Bahrainsk", "Bangladeshi",
  "Bangladeshisk", "Barbadian", "Barbadisk", "Belarusian", "Vitrysk",
  "Belgian", "Belgisk", "Belizean", "Belizisk", "Beninese", "Beninsk",
  "Bhutanese", "Bhutanesisk", "Bolivian", "Boliviansk", "Bosnian", "Bosnisk",
  "Botswanan", "Botswansk", "Brazilian", "Brasiliansk", "British", "Brittisk",
  "Bruneian", "Bruneisk", "Bulgarian", "Bulgarisk", "Burkinabe", "Burkinsk",
  "Burmese", "Burmesisk", "Burundian", "Burundisk",
  "Cabo Verdean", "Kapverdisk", "Cambodian", "Kambodjansk", "Cameroonian",
  "Kamerunsk", "Canadian", "Kanadensisk", "Central African",
  "Centralafrikansk", "Chadian", "Tchadisk", "Chilean", "Chilensk",
  "Chinese", "Kinesisk", "Colombian", "Colombiansk", "Comoran", "Komorisk",
  "Congolese", "Kongolesisk", "Costa Rican", "Costaricansk", "Croatian",
  "Kroatisk", "Cuban", "Kubansk", "Cypriot", "Cypriotisk", "Czech",
  "Tjeckisk",
  "Danish", "Dansk", "Djiboutian", "Djiboutisk", "Dominican", "Dominikansk",
  "Dutch", "Nederländsk",
  "East Timorese", "Östtimorisk", "Ecuadorean", "Ecuadoriansk", "Egyptian",
  "Egyptisk", "Emirati", "Emiratisk", "Equatoguinean", "Ekvatorialguineansk",
  "Eritrean", "Eritreansk", "Estonian", "Estnisk", "Ethiopian", "Etiopisk",
  "Fijian", "Fijiansk", "Finnish", "Finsk", "French", "Fransk",
  "Gabonese", "Gabonisk", "Gambian", "Gambisk", "Georgian", "Georgisk",
  "German", "Tysk", "Ghanaian", "Ghanansk", "Greek", "Grekisk", "Grenadian",
  "Grenadisk", "Guatemalan", "Guatemalansk", "Guinean", "Guineansk",
  "Guyanese", "Guyansk",
  "Haitian", "Haitisk", "Honduran", "Honduransk", "Hungarian", "Ungersk",
  "Icelander", "Isländsk", "Indian", "Indisk", "Indonesian", "Indonesisk",
  "Iranian", "Iransk", "Iraqi", "Irakisk", "Irish", "Irländsk", "Israeli",
  "Israelisk", "Italian", "Italiensk", "Ivorian", "Ivoriansk",
  "Jamaican", "Jamaicansk", "Japanese", "Japansk", "Jordanian", "Jordansk",
  "Kazakh", "Kazakisk", "Kenyan", "Kenyansk", "Kittitian", "Saintkittisk",
  "Kuwaiti", "Kuwaitisk", "Kyrgyz", "Kirgizisk",
  "Laotian", "Laotisk", "Latvian", "Lettisk", "Lebanese", "Libanesisk",
  "Liberian", "Liberiansk", "Libyan", "Libysk", "Liechtensteiner",
  "Liechtensteinsk", "Lithuanian", "Litauisk", "Luxembourger", "Luxemburgsk",
  "Macedonian", "Makedonisk", "Malagasy", "Madagaskisk", "Malawian",
  "Malawisk", "Malaysian", "Malaysisk", "Maldivian", "Maldivisk", "Malian",
  "Malisk", "Maltese", "Maltesisk", "Marshallese", "Marshallisk",
  "Mauritanian", "Mauretansk", "Mauritian", "Mauritiansk", "Mexican",
  "Mexikansk", "Micronesian", "Mikronesiska", "Moldovan", "Moldavisk",
  "Monacan", "Monegaskisk", "Mongolian", "Mongolisk", "Moroccan",
  "Marockansk", "Mozambican", "Moçambikisk",
  "Namibian", "Namibisk", "Nauruan", "Nauruansk", "Nepalese", "Nepalesisk",
  "Nicaraguan", "Nicaraguansk", "Nigerien", "Nigerisk", "Nigerian",
  "Nigeriansk", "Norwegian", "Norsk",
  "Omani", "Omanisk",
  "Pakistani", "Pakistansk", "Palauan", "Palauansk", "Palestinian",
  "Palestinsk", "Panamanian", "Panamansk", "Papuan", "Papuaansk",
  "Paraguayan", "Paraguayansk", "Peruvian", "Peruansk", "Philippine",
  "Filippinsk", "Polish", "Polsk", "Portuguese", "Portugisisk",
  "Qatari", "Qatarisk",
  "Romanian", "Rumänsk", "Russian", "Rysk", "Rwandan", "Rwandisk",
  "Saint Lucian", "Saintluciansk", "Salvadoran", "Salvadoransk",
  "Sammarinese", "Sanmarinesisk", "Samoan", "Samoansk", "São Toméan",
  "Sãotomeansk", "Saudi", "Saudiarabisk", "Senegalese", "Senegalesisk",
  "Serbian", "Serbisk", "Seychellois", "Seychellisk", "Sierra Leonean",
  "Sierraleonsk", "Singaporean", "Singaporiansk", "Slovak", "Slovakisk",
  "Slovenian", "Slovensk", "Solomon Islander", "Salomonsk", "Somali",
  "Somalisk", "South African", "Sydafrikansk", "South Sudanese",
  "Sydsudanesisk", "Spanish", "Spansk", "Sri Lankan", "Sri Lanka",
  "Sudanese", "Sudanesisk", "Surinamer", "Surinamesisk", "Swazi", "Swazisk",
  "Swedish", "Svensk", "Swiss", "Schweizisk", "Syrian", "Syrisk",
  "Tanzanian", "Tanzanisk", "Thai", "Thailändsk", "Togolese", "Togolesisk",
  "Tongan", "Tongansk", "Trinidadian", "Trinidadisk", "Tunisian", "Tunisisk",
  "Turkish", "Turkisk", "Tuvaluan", "Tuvaluansk",
  "Ugandan", "Ugandisk", "Ukrainian", "Ukrainsk", "Uruguayan",
  "Uruguayansk", "Uzbek", "Uzbekisk",
  "Vanuatuan", "Vanuatisk", "Venezuelan", "Venezuelansk", "Vietnamese",
  "Vietnamesisk",
  "Yemeni", "Jemenitisk",
  "Zambian", "Zambisk", "Zimbabwean", "Zimbabwisk",
];

// Swedish demonyms end in -sk/-ska ("svensk", "mikronesiska"); the rest
// of the interleaved nationality list is English.
const SWEDISH_DEMONYM = /(?:sk|ska)$/;
const NATIONALITY_EXTRA_SV = new Set(["Amerikan", "Surinamer"]);
const isSwedishDemonym = (term: string) =>
  SWEDISH_DEMONYM.test(term) || NATIONALITY_EXTRA_SV.has(term);

/**
 * Swedish demonyms are not capitalized in prose ("hon är svensk"), so
 * they match case-insensitively.
 */
export const demographic: Detector = regexDetector("DEMOGRAPHIC", () =>
  termListRegex([
    ...ETHNICITY_TERMS_SV,
    ...NATIONALITY_TERMS.filter(isSwedishDemonym),
  ])
);

/**
 * English demonyms ARE capitalized, and several are homographs of
 * common lowercase words ("polish the furniture", "thai mat") — so they
 * match case-sensitively.
 */
export const demographicEnglish: Detector = regexDetector("DEMOGRAPHIC", () =>
  termListRegex(
    [...ETHNICITY_TERMS_EN, ...NATIONALITY_TERMS.filter((t) => !isSwedishDemonym(t))],
    "gu"
  )
);

export const politicalIdeologies: Detector = regexDetector(
  "POLITICAL_IDEOLOGIES",
  () => termListRegex(POLITICAL_IDEOLOGY_TERMS)
);

export const sensitiveAttributeDetectors: Detector[] = [
  maritalStatus,
  maritalStatusAmbiguous,
  geneticSex,
  disability,
  religion,
  sexualOrientation,
  demographic,
  demographicEnglish,
  politicalIdeologies,
];
