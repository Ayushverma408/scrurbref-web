export interface HighYieldTopic {
  title: string;
  tag: string; // specialty tag
}

// Updated weekly — manually curated from NEET-SS / INI-SS high-yield syllabus
export const HIGH_YIELD_THIS_WEEK: HighYieldTopic[] = [
  { title: "Portal hypertension: classification and surgical options", tag: "HPB" },
  { title: "Bile duct injury: Strasberg classification and repair", tag: "Biliary" },
  { title: "Damage control laparotomy: indications and steps", tag: "Trauma" },
  { title: "Principles of oesophagectomy: McKeown vs Ivor Lewis", tag: "Upper GI" },
  { title: "Inguinal canal anatomy and hernia repairs", tag: "General" },
];

export const WEEK_LABEL = "Week of 24 March 2026";
