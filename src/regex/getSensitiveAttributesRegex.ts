const getMartialStatusRegex = () => {
  return new RegExp(
    "\\b(" +
      "Single|Unmarried|Married|Divorced|Widowed|Engaged|Separated|Cohabiting|In a Relationship|Registered partner" + // English
      "Ogift|Gift|Skild|Änka|Änkling|Förlovad|Separerad|Sambo|I ett Förhållande|Registrerad partner" + // Swedish
      ")\\b",
    "gi"
  );
};

const getGeneticSexRegex = () => {
  return new RegExp(
    "\\b(" +
      "Male|Female|Man|Woman|Boy|Girl|Masculine|Feminine|Hermaphrodite|Intersex|" + // English
      "Hane|Hona|Manlig|Kvinna|Pojke|Flicka|Maskulin|Feminin|Hermafrodit|Intersexuell" + // Swedish
      ")\\b",
    "gi"
  );
};

const getDisabilityRegex = () => {
  return new RegExp(
    "\\b(" +
      // Swedish terms
      "Rörelsehinder|Synskada(d?)|Hörselskada(d?)|Döv|Dövhet|Blind|Blindhet|Utvecklingsstörning|Autism|ADHD|Dyslexi|" +
      "Psykisk Funktionsnedsättning|Intellektuell Funktionsnedsättning|CP-Skada|Epilepsi|Multipel Skleros|" +
      "Cerebral Pares|Asperger|Downsyndrom|Nedsatt Hörsel|Nedsatt Syn|Funktionsnedsättning|Funktionshinder|Rullstolsburen|" +
      "Handikapp|Handikappad|" +
      // English terms
      "Physical Disability|Visual Impairment|Hearing Impairment|Deaf|Deafness|Blind|Blindness|Intellectual Disability|Autism|" +
      "ADHD|Dyslexia|Mental Disability|Cognitive Disability|Cerebral Palsy|Epilepsy|Multiple Sclerosis|Asperger|Down Syndrome|" +
      "Hearing Loss|Low Vision|Disability|Impairment|Wheelchair User|Handicapped" +
      ")\\b",
    "gi"
  );
};

const getReligionRegex = () => {
  return new RegExp(
    "\\b(" +
      // Swedish terms
      "Kristen|Muslim|Jude|Judisk|Hindu|Buddhist|Ateist|Agnostiker|Sikh|Katolik|Protestant|Ortodox|Mormon|" +
      "Hedning|Shinto|Zoroastrier|Kristendom|Islam|Judendom|Hinduism|Buddhism|Sikhism|Shintoism|Zoroastrism|" +
      // English terms
      "Christian|Muslim|Jew|Jewish|Hindu|Buddhist|Atheist|Agnostic|Sikh|Catholic|Protestant|Orthodox|Mormon|" +
      "Pagan|Shinto|Zoroastrian|Christianity|Islam|Judaism|Hinduism|Buddhism|Sikhism|Shintoism|Zoroastrianism" +
      ")\\b",
    "gi"
  );
};

const getSexualOrientationRegex = () => {
  return new RegExp(
    "\\b(" +
      "Queer|Questioning|Bicurious|Straight|Gay|Lesbian|Two-Spirit|[a-zA-Z-]+sexual|[a-zA-Z-]+romantic|[a-zA-Z-]+platonic|[a-zA-Z-]+flexible|[a-zA-Z-]+sexuality|" +
      "Bög|Lesbisk|Tvåkönad|[a-zA-Z-]+sexuell|[a-zA-Z-]+romantisk|[a-zA-Z-]+platonisk|[a-zA-Z-]+flexibel|[a-zA-Z-]+sexualitet" +
      ")\\b",
    "gi"
  );
};

const getDeomographicRegex = () => {
  return new RegExp(
    "\\b(" +
      // Ethnicity terms
      "Afroamerikan|Asiat|Asiatisk|Kaukasisk|Hispanisk|Latinamerikansk|Ursprungsamerikan|Stillahavsöbor|Mellanöstern|Arabisk|Judisk|Ursprungsbefolkning|Europeisk|Amerikan|" +
      "African|African American|Asian|Caucasian|Caucasoid|Hispanic|Latino|Latina|Native American|Pacific Islander|Middle Eastern|Arab|Jewish|Indigenous|European|American|" +
      // Nationality / Language terms
      "Afghan|Afghansk|Albanian|Albansk|Algerian|Algerisk|American|Amerikan|Andorran|Andorran|Angolan|Angolansk|Argentinian|Argentinsk|Armenian|Armenisk|Australian|Australisk|Austrian|Österrikisk|Azerbaijani|Azerisk|" +
      "Bahamian|Bahamisk|Bahraini|Bahrainsk|Bangladeshi|Bangladeshisk|Barbadian|Barbadisk|Belarusian|Vitrysk|Belgian|Belgisk|Belizean|Belizisk|Beninese|Beninsk|Bhutanese|Bhutanesisk|Bolivian|Boliviansk|Bosnian|Bosnisk|Botswanan|Botswansk|Brazilian|Brasiliansk|British|Brittisk|Bruneian|Bruneisk|Bulgarian|Bulgarisk|Burkinabe|Burkinsk|Burmese|Burmesisk|Burundian|Burundisk|" +
      "Cabo Verdean|Kapverdisk|Cambodian|Kambodjansk|Cameroonian|Kamerunsk|Canadian|Kanadensisk|Central African|Centralafrikansk|Chadian|Tchadisk|Chilean|Chilensk|Chinese|Kinesisk|Colombian|Colombiansk|Comoran|Komorisk|Congolese|Kongolesisk|Costa Rican|Costaricansk|Croatian|Kroatisk|Cuban|Kubansk|Cypriot|Cypriotisk|Czech|Tjeckisk|" +
      "Danish|Dansk|Djiboutian|Djiboutisk|Dominican|Dominikansk|Dutch|Nederländsk|" +
      "East Timorese|Östtimorisk|Ecuadorean|Ecuadoriansk|Egyptian|Egyptisk|Emirati|Emiratisk|Equatoguinean|Ekvatorialguineansk|Eritrean|Eritreansk|Estonian|Estnisk|Ethiopian|Etiopisk|" +
      "Fijian|Fijiansk|Finnish|Finsk|French|Fransk|" +
      "Gabonese|Gabonisk|Gambian|Gambisk|Georgian|Georgisk|German|Tysk|Ghanaian|Ghanansk|Greek|Grekisk|Grenadian|Grenadisk|Guatemalan|Guatemalansk|Guinean|Guineansk|Guyanese|Guyansk|" +
      "Haitian|Haitisk|Honduran|Honduransk|Hungarian|Ungersk|" +
      "Icelander|Isländsk|Indian|Indisk|Indonesian|Indonesisk|Iranian|Iransk|Iraqi|Irakisk|Irish|Irländsk|Israeli|Israelisk|Italian|Italiensk|Ivorian|Ivoriansk|" +
      "Jamaican|Jamaicansk|Japanese|Japansk|Jordanian|Jordansk|" +
      "Kazakh|Kazakisk|Kenyan|Kenyansk|Kittitian|Saintkittisk|Kuwaiti|Kuwaitisk|Kyrgyz|Kirgizisk|" +
      "Laotian|Laotisk|Latvian|Lettisk|Lebanese|Libanesisk|Liberian|Liberiansk|Libyan|Libysk|Liechtensteiner|Liechtensteinsk|Lithuanian|Litauisk|Luxembourger|Luxemburgsk|" +
      "Macedonian|Makedonisk|Malagasy|Madagaskisk|Malawian|Malawisk|Malaysian|Malaysisk|Maldivian|Maldivisk|Malian|Malisk|Maltese|Maltesisk|Marshallese|Marshallisk|Mauritanian|Mauretansk|Mauritian|Mauritiansk|Mexican|Mexikansk|Micronesian|Mikronesiska|Moldovan|Moldavisk|Monacan|Monegaskisk|Mongolian|Mongolisk|Moroccan|Marockansk|Mozambican|Moçambikisk|" +
      "Namibian|Namibisk|Nauruan|Nauruansk|Nepalese|Nepalesisk|Nicaraguan|Nicaraguansk|Nigerien|Nigerisk|Nigerian|Nigeriansk|Norwegian|Norsk|" +
      "Omani|Omanisk|" +
      "Pakistani|Pakistansk|Palauan|Palauansk|Palestinian|Palestinsk|Panamanian|Panamansk|Papuan|Papuaansk|Paraguayan|Paraguayansk|Peruvian|Peruansk|Philippine|Filippinsk|Polish|Polsk|Portuguese|Portugisisk|" +
      "Qatari|Qatarisk|" +
      "Romanian|Rumänsk|Russian|Rysk|Rwandan|Rwandisk|" +
      "Saint Lucian|Saintluciansk|Salvadoran|Salvadoransk|Sammarinese|Sanmarinesisk|Samoan|Samoansk|São Toméan|Sãotomeansk|Saudi|Saudiarabisk|Senegalese|Senegalesisk|Serbian|Serbisk|Seychellois|Seychellisk|Sierra Leonean|Sierraleonsk|Singaporean|Singaporiansk|Slovak|Slovakisk|Slovenian|Slovensk|Solomon Islander|Salomonsk|Somali|Somalisk|South African|Sydafrikansk|South Sudanese|Sydsudanesisk|Spanish|Spansk|Sri Lankan|Sri Lanka|Sudanese|Sudanesisk|Surinamer|Surinamesisk|Swazi|Swazisk|Swedish|Svensk|Swiss|Schweizisk|Syrian|Syrisk|" +
      "Tanzanian|Tanzanisk|Thai|Thailändsk|Togolese|Togolesisk|Tongan|Tongansk|Trinidadian|Trinidadisk|Tunisian|Tunisisk|Turkish|Turkisk|Tuvaluan|Tuvaluansk|" +
      "Ugandan|Ugandisk|Ukrainian|Ukrainsk|Uruguayan|Uruguayansk|Uzbek|Uzbekisk|" +
      "Vanuatuan|Vanuatisk|Venezuelan|Venezuelansk|Vietnamese|Vietnamesisk|" +
      "Yemeni|Jemenitisk|" +
      "Zambian|Zambisk|Zimbabwean|Zimbabwisk" +
      ")\\b",
    "i"
  );
};

const getPoliticalIdeologiesRegex = () => {
  return new RegExp(
    "\\b(" +
      // Swedish terms
      "Liberal|Konservativ|Socialdemokrat|Socialist|Progressiv|Nationalist|Populist|" +
      "Libertarian|Centrist|Miljövän|Kapitalist|Kommunist|Fascist|Anarkist|" +
      // English terms
      "Liberal|Conservative|Social Democrat|Socialist|Progressive|Nationalist|Populist|" +
      "Libertarian|Centrist|Environmentalist|Capitalist|Communist|Fascist|Anarchist" +
      ")\\b",
    "gi"
  );
};

export {
  getMartialStatusRegex,
  getGeneticSexRegex,
  getDisabilityRegex,
  getReligionRegex,
  getSexualOrientationRegex,
  getDeomographicRegex,
  getPoliticalIdeologiesRegex,
};
