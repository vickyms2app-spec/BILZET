/**
 * Comprehensive Country, Region, and Dependent State Data Provider for BILZET Backend.
 * Provides ISO-standard states/provinces/administrative divisions for all supported countries.
 */

export const COUNTRY_DATA = [
  {
    name: "India",
    aliases: ["IN", "Bharat"],
    code: "IN",
    phoneCode: "+91",
    label: "India",
    defaultState: "Tamil Nadu",
    states: [
      "Tamil Nadu",
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chandigarh",
      "Chhattisgarh",
      "Dadra and Nagar Haveli and Daman and Diu",
      "Delhi",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jammu and Kashmir",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Ladakh",
      "Lakshadweep",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Puducherry",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
      "Andaman and Nicobar Islands",
    ],
  },
  {
    name: "United States",
    aliases: ["USA", "US", "United States of America"],
    code: "US",
    phoneCode: "+1",
    label: "United States",
    defaultState: "California",
    states: [
      "Alabama",
      "Alaska",
      "Arizona",
      "Arkansas",
      "California",
      "Colorado",
      "Connecticut",
      "Delaware",
      "District of Columbia",
      "Florida",
      "Georgia",
      "Hawaii",
      "Idaho",
      "Illinois",
      "Indiana",
      "Iowa",
      "Kansas",
      "Kentucky",
      "Louisiana",
      "Maine",
      "Maryland",
      "Massachusetts",
      "Michigan",
      "Minnesota",
      "Mississippi",
      "Missouri",
      "Montana",
      "Nebraska",
      "Nevada",
      "New Hampshire",
      "New Jersey",
      "New Mexico",
      "New York",
      "North Carolina",
      "North Dakota",
      "Ohio",
      "Oklahoma",
      "Oregon",
      "Pennsylvania",
      "Puerto Rico",
      "Rhode Island",
      "South Carolina",
      "South Dakota",
      "Tennessee",
      "Texas",
      "Utah",
      "Vermont",
      "Virginia",
      "Washington",
      "West Virginia",
      "Wisconsin",
      "Wyoming",
    ],
  },
  {
    name: "Singapore",
    aliases: ["SG", "Republic of Singapore"],
    code: "SG",
    phoneCode: "+65",
    label: "Singapore",
    defaultState: "Central Singapore",
    states: [
      "Central Singapore",
      "North East",
      "North West",
      "South East",
      "South West",
    ],
  },
  {
    name: "United Arab Emirates",
    aliases: ["UAE", "AE", "Emirates"],
    code: "AE",
    phoneCode: "+971",
    label: "UAE",
    defaultState: "Dubai",
    states: [
      "Abu Dhabi",
      "Dubai",
      "Sharjah",
      "Ajman",
      "Umm Al-Quwain",
      "Ras Al-Khaimah",
      "Fujairah",
    ],
  },
  {
    name: "United Kingdom",
    aliases: ["UK", "GB", "Great Britain", "Britain"],
    code: "GB",
    phoneCode: "+44",
    label: "United Kingdom",
    defaultState: "England",
    states: [
      "England",
      "Scotland",
      "Wales",
      "Northern Ireland",
    ],
  },
  {
    name: "Canada",
    aliases: ["CA"],
    code: "CA",
    phoneCode: "+1",
    label: "Canada",
    defaultState: "Ontario",
    states: [
      "Alberta",
      "British Columbia",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Northwest Territories",
      "Nova Scotia",
      "Nunavut",
      "Ontario",
      "Prince Edward Island",
      "Quebec",
      "Saskatchewan",
      "Yukon",
    ],
  },
  {
    name: "Australia",
    aliases: ["AU"],
    code: "AU",
    phoneCode: "+61",
    label: "Australia",
    defaultState: "New South Wales",
    states: [
      "Australian Capital Territory",
      "New South Wales",
      "Northern Territory",
      "Queensland",
      "South Australia",
      "Tasmania",
      "Victoria",
      "Western Australia",
    ],
  },
  {
    name: "Saudi Arabia",
    aliases: ["KSA", "SA"],
    code: "SA",
    phoneCode: "+966",
    label: "Saudi Arabia",
    defaultState: "Riyadh",
    states: [
      "Riyadh",
      "Makkah",
      "Eastern Province",
      "Madinah",
      "Al-Qassim",
      "Asir",
      "Tabuk",
      "Ha'il",
      "Northern Borders",
      "Jazan",
      "Najran",
      "Al-Bahah",
      "Al-Jawf",
    ],
  },
];

export function findCountry(countryNameOrCode) {
  if (!countryNameOrCode) return null;
  const clean = String(countryNameOrCode).trim().toLowerCase();
  return (
    COUNTRY_DATA.find((c) => {
      if (c.name.toLowerCase() === clean) return true;
      if (c.code.toLowerCase() === clean) return true;
      if (c.label && c.label.toLowerCase() === clean) return true;
      if (c.aliases && c.aliases.some((a) => a.toLowerCase() === clean)) return true;
      return false;
    }) || null
  );
}

export function getCountries() {
  return COUNTRY_DATA.map(({ name, code, phoneCode, label, defaultState }) => ({
    name,
    code,
    phoneCode,
    label: label || name,
    defaultState,
  }));
}

export function getStatesForCountry(countryNameOrCode) {
  const match = findCountry(countryNameOrCode);
  return match ? [...match.states] : [];
}

export function isValidStateForCountry(countryNameOrCode, stateName) {
  if (!countryNameOrCode || !stateName) return false;
  const states = getStatesForCountry(countryNameOrCode);
  if (states.length === 0) return true;
  const target = String(stateName).trim().toLowerCase();
  return states.some((s) => s.toLowerCase() === target);
}

export function getDefaultStateForCountry(countryNameOrCode) {
  const match = findCountry(countryNameOrCode);
  return match?.defaultState || "";
}

export function getCountryPhoneCode(countryNameOrCode) {
  const match = findCountry(countryNameOrCode);
  return match?.phoneCode || "+91";
}
