// Mirrors the "Request a Quote" form on tapsvs.com so requests map 1:1.

export const SERVICE_GROUPS: { group: string; options: string[] }[] = [
  {
    group: "Field Documentation",
    options: [
      "Electrical Single Line Diagram",
      "Equipment Layout Drawings",
      "Circuitry Layout Drawings",
      "Electrical Condition Assessments",
      "Electrical Capital Planning",
      "Design Build",
      "Electrical Equipment Inspections",
    ],
  },
  { group: "Facility Safety", options: ["LOTO Turn-Key Programs", "Confined Space Turn-Key Programs"] },
  {
    group: "Field Study",
    options: [
      "Protective Device Coordination Studies",
      "Electrical Load Studies",
      "Power Quality Studies",
      "Harmonic Studies",
      "Motor Starting Studies",
      "Power Factor Studies",
      "Grounding System Studies",
    ],
  },
  {
    group: "Field Audits",
    options: [
      "Arc Flash Compliance",
      "Facility NEC Code Compliance",
      "Electrical Maintenance",
      "Electrical Risk",
      "Catastrophic Electrical Procurement",
      "Facility Preparedness",
      "Electrical Reliability",
      "Electrical Sustainability",
      "LOTO Compliance",
      "Confined Space",
    ],
  },
  {
    group: "Field Inspections & Analysis",
    options: [
      "Arc Flash Hazard Analysis",
      "Facility Electrical Equipment Inspections",
      "Ground Testing and Analysis",
      "Infrared Thermography Inspections",
      "Ultrasonic Testing",
      "Vibration Analysis",
      "Electrical Preventive Maintenance (PM)",
      "Electrical Predictive Maintenance (PdM)",
      "Transformer Oil Sampling and Analysis",
    ],
  },
  {
    group: "Field Installations",
    options: ["Power Factor Capacitor(s)", "Harmonic Filter(s)", "Infrared Windows", "Electrical Service Projects", "Equipment Moves"],
  },
  { group: "PP Maintenance", options: ["PP Maintenance"] },
];

export const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) => g.options);

export const TRAINING_OPTIONS = [
  "National Electric Code Training",
  "Electrical Training",
  "Electrical Safety Training",
  "Industrial Automation Training",
  "Electrical Maintenance Training",
  "OSHA Training",
  "N/A",
];

export const US_STATES = [
  "Alabama", "Alaska", "American Samoa", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
  "District of Columbia", "Florida", "Georgia", "Guam", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
  "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina",
  "North Dakota", "Northern Mariana Islands", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Puerto Rico",
  "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "U.S. Virgin Islands", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "Armed Forces Americas", "Armed Forces Europe",
  "Armed Forces Pacific",
];
