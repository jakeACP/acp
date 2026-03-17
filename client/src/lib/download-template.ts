export function downloadCsv(filename: string, headers: string[], sampleRow?: string[]) {
  const rows = [headers.join(",")];
  if (sampleRow) {
    rows.push(sampleRow.map(v => `"${v}"`).join(","));
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const TEMPLATES = {
  sigs: {
    filename: "sigs_template.csv",
    headers: [
      "NAME","ACRONYM","DESCRIPTION","CATEGORY","INTEREST","WEBSITE",
      "CONTACT_EMAIL","CONTACT_PHONE","HEADQUARTERS","FOUNDED_YEAR",
      "LOGO_URL","FEC_ID","TOTAL_CONTRIBUTIONS","INFLUENCE_SCORE",
      "LETTER_GRADE","GRADE_WEIGHT","IS_ACTIVE","DISCLOSURE_NOTES",
      "DATA_SOURCE_NAME","DATA_SOURCE_URL"
    ],
    sample: [
      "Example PAC","EPAC","Brief description of the group",
      "super_pac","finance","https://example.com",
      "info@example.com","202-555-0100","Washington, DC","2010",
      "","C00000000","5000000","-10",
      "D","1.0","true","Internal notes here",
      "OpenSecrets","https://opensecrets.org"
    ],
  },
  politicians: {
    filename: "politicians_template.csv",
    headers: ["FULL_NAME","STATE","PARTY","CHAMBER","DISTRICT","OFFICE_TITLE","BIOGRAPHY","WEBSITE","EMAIL","PHONE"],
    sample: ["Jane Smith","MN","Democratic","Senate","Minnesota","U.S. Senator from Minnesota","Brief bio here","https://example.gov","senator@example.gov","202-555-0100"],
  },
  candidates: {
    filename: "candidates_template.csv",
    headers: ["FULL_NAME","PROFILE_TYPE","OFFICE","OFFICE_LEVEL","STATE","DISTRICT","PARTY","INCUMBENT","STATUS","PRIMARY_DATE","GENERAL_DATE","FEC_CANDIDATE_ID","BALLOTPEDIA_URL","WEBSITE","EMAIL","PHONE","BIOGRAPHY","PHOTO_URL","NOTES"],
    sample: ["Jane Smith","candidate","U.S. Senate","Federal","Minnesota","","Democratic","No","Candidacy Declared","August 11, 2026","November 3, 2026","S0MN00123","https://ballotpedia.org/Jane_Smith","https://janesmith.com","jane@janesmith.com","651-555-0100","Brief bio here","",""],
  },
  representatives: {
    filename: "representatives_template.csv",
    headers: ["NAME","OFFICE_TITLE","OFFICE_LEVEL","PARTY","EMAIL","PHONE","WEBSITE","DISTRICT","JURISDICTION","TERM_START","TERM_END","NOTES"],
    sample: ["Jane Smith","State Senator","state","Democratic","senator@example.gov","651-555-0100","https://example.gov","District 22","Minnesota","01/01/2023","12/31/2026",""],
  },
};
