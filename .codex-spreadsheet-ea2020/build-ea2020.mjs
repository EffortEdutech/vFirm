import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/user/Documents/00 Agent Skills/virtual-firm/.codex-spreadsheet-ea2020/outputs";
const outputPath = `${outputDir}/Form-EA-2020-Pindaan-2017.xlsx`;

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("EA 2020");
sheet.showGridLines = false;

function set(addr, value) {
  sheet.getRange(addr).values = [[value]];
}

function merge(addr, value, style = {}) {
  const range = sheet.getRange(addr);
  range.merge();
  range.values = [[value]];
  range.format = style;
}

const dark = { fill: "#1F4E78", font: { bold: true, color: "#FFFFFF" }, wrapText: true };
const section = { fill: "#D9EAF7", font: { bold: true, color: "#111827" }, wrapText: true };
const input = { fill: "#FFFBEA", border: { bottom: { style: "thin", color: "#9CA3AF" } }, wrapText: true };
const label = { wrapText: true, verticalAlignment: "top" };
const amount = { fill: "#FFFBEA", numberFormat: "#,##0.00", border: { bottom: { style: "thin", color: "#9CA3AF" } } };

sheet.getRange("A:J").format.font = { name: "Arial", size: 10, color: "#111827" };
sheet.getRange("A:A").format.columnWidthPx = 44;
sheet.getRange("B:B").format.columnWidthPx = 46;
sheet.getRange("C:H").format.columnWidthPx = 115;
sheet.getRange("I:I").format.columnWidthPx = 95;
sheet.getRange("J:J").format.columnWidthPx = 135;

merge("A1:B1", "(C.P.8A - Pin. 2017)", { font: { bold: true }, wrapText: true });
merge("C1:H1", "MALAYSIA\nINCOME TAX\nSTATEMENT OF REMUNERATION FROM EMPLOYMENT", {
  font: { bold: true, size: 14, color: "#111827" },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
});
merge("I1:J1", "PRIVATE SECTOR Employee's Statement of Remuneration\nEA", {
  fill: "#111827",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "middle",
  wrapText: true,
});
sheet.getRange("A1:J1").format.rowHeightPx = 76;

merge("A3:C3", "Serial No.", label);
merge("D3:H3", "", input);
merge("I3:I3", "Employee's Income Tax No.", label);
sheet.getRange("J3").format = input;
merge("A4:C4", "Employer's No. E", label);
merge("D4:H4", "", input);
merge("I4:I4", "LHDNM Branch", label);
sheet.getRange("J4").format = input;
merge("A5:C5", "FOR THE YEAR ENDED 31 DECEMBER", label);
merge("D5:J5", "", input);
merge("A6:J6", "THIS FORM EA MUST BE PREPARED AND PROVIDED TO THE EMPLOYEE FOR INCOME TAX PURPOSE", dark);
sheet.getRange("A3:J5").format.rowHeightPx = 34;
sheet.getRange("A6:J6").format.rowHeightPx = 26;

let r = 8;
function sectionRow(letter, title) {
  set(`A${r}`, letter);
  merge(`B${r}:J${r}`, title, section);
  sheet.getRange(`A${r}`).format = dark;
  sheet.getRange(`A${r}:J${r}`).format.rowHeightPx = 28;
  r += 1;
}
function field(no, text, valueCols = "F:J") {
  set(`B${r}`, no);
  merge(`C${r}:E${r}`, text, label);
  const [start, end = start] = valueCols.split(":");
  sheet.getRange(`${start}${r}:${end}${r}`).format = input;
  sheet.getRange(`A${r}:J${r}`).format.rowHeightPx = text.length > 70 ? 48 : 28;
  r += 1;
}
function money(no, text) {
  set(`B${r}`, no);
  merge(`C${r}:H${r}`, text, label);
  set(`I${r}`, "RM");
  sheet.getRange(`J${r}`).format = amount;
  sheet.getRange(`A${r}:J${r}`).format.rowHeightPx = text.length > 70 ? 48 : 28;
  r += 1;
}

sectionRow("A", "PARTICULARS OF EMPLOYEE");
field("1.", "Full Name of Employee/Pensioner (Mr./Miss/Madam)");
field("2.", "Job Designation");
field("3.", "Staff No./Payroll No.");
field("4.", "New I.C. No.");
field("5.", "Passport No.");
field("6.", "EPF No.");
field("7.", "SOCSO No.");
field("8.", "Number Of Children Qualified For Tax Relief");
field("9(a).", "If the period of employment is less than a year, Date of commencement");
field("9(b).", "If the period of employment is less than a year, Date of cessation");

r += 1;
sectionRow("B", "EMPLOYMENT INCOME, BENEFITS AND LIVING ACCOMMODATION (Excluding Tax Exempt Allowances/Perquisites/Gifts/Benefits)");
money("1(a).", "Gross salary, wages or leave pay (including overtime pay)");
money("1(b).", "Fees (including director fees), commission or bonus");
money("1(c).", "Gross tips, perquisites, awards/rewards or other allowances");
field("", "Details of payment for 1(c)");
money("1(d).", "Income Tax borne by the Employer in respect of his Employee");
money("1(e).", "Employee Share Option Scheme (ESOS) benefit");
field("1(f).", "Gratuity period from / to");
money("", "Gratuity amount");
field("2.", "Details of arrears and others for preceding years paid in the current year - Type of income (a)");
money("", "Amount for 2(a)");
field("", "Type of income (b)");
money("", "Amount for 2(b)");
money("3.", "Benefits in kind");
field("", "Specify benefits in kind");
money("4.", "Value of living accommodation provided");
field("", "Address of living accommodation");
money("5.", "Refund from unapproved Provident/Pension Fund");
money("6.", "Compensation for loss of employment");

r += 1;
sectionRow("C", "PENSION AND OTHERS");
money("1.", "Pension");
money("2.", "Annuities or other Periodical Payments");
money("", "TOTAL");
sheet.getRange(`C${r - 1}:J${r - 1}`).format = { fill: "#E2F0D9", font: { bold: true }, numberFormat: "#,##0.00" };

r += 1;
sectionRow("D", "TOTAL DEDUCTION");
money("1.", "Monthly Tax Deductions (MTD) remitted to LHDNM");
money("2.", "CP 38 Deductions");
money("3.", "Zakat paid via salary deduction");
field("4(a).", "Total claim for deduction by employee via Form TP1 - Relief", "I:J");
field("4(b).", "Total claim for deduction by employee via Form TP1 - Zakat other than that paid via monthly salary deduction", "I:J");
money("5.", "Total qualifying child relief");

r += 1;
sectionRow("E", "CONTRIBUTIONS PAID BY EMPLOYEE TO APPROVED PROVIDENT/PENSION FUND AND SOCSO");
field("1.", "Name of Provident Fund");
money("", "Amount of compulsory contribution paid (state the employee's share of contribution only)");
money("2.", "SOCSO: Amount of compulsory contribution paid (state the employee's share of contribution only)");

r += 1;
sectionRow("F", "TOTAL TAX EXEMPT ALLOWANCES / PERQUISITES / GIFTS / BENEFITS");
money("", "Total tax exempt allowances / perquisites / gifts / benefits");

r += 2;
merge(`A${r}:B${r}`, "Name of Officer", label);
merge(`C${r}:J${r}`, "", input);
r += 1;
merge(`A${r}:B${r}`, "Designation", label);
merge(`C${r}:J${r}`, "", input);
r += 1;
merge(`A${r}:B${r}`, "Name and Address of Employer", label);
merge(`C${r}:J${r + 2}`, "", input);
r += 3;
merge(`A${r}:B${r}`, "Date", label);
merge(`C${r}:D${r}`, "", input);
merge(`E${r}:G${r}`, "Employer's Telephone No.", label);
merge(`H${r}:J${r}`, "", input);

sheet.getRange(`A1:J${r}`).format.wrapText = true;
sheet.getRange(`A1:J${r}`).format.verticalAlignment = "top";
sheet.freezePanes.freezeRows(6);

// Add the notes page from PDF page 2 as a usable worksheet.
const notes = workbook.worksheets.add("Exemption Notes");
notes.showGridLines = false;
notes.getRange("A1:C1").values = [["NO.", "SUBJECT", "EXEMPTION LIMIT (PER YEAR)"]];
notes.getRange("A1:C1").format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  wrapText: true,
};
notes.getRange("A2:C10").values = [
  ["1", "Petrol allowance, travelling allowance or toll payment, or any combination, for official duties. If the amount received exceeds RM6,000 a year, the employee can make a further deduction for the amount spent for official duties. Records must be kept for seven years for audit purpose.", "RM6,000"],
  ["2", "Child care allowance in respect of children up to 12 years of age.", "RM2,400"],
  ["3", "Gift of fixed line telephone, mobile phone, pager or PDA including registration and installation, registered in the name of the employee or employer.", "Limited to only 1 unit for each category of assets"],
  ["4", "Monthly bills for fixed line telephone, mobile phone, pager, PDA or broadband, including registration and installation, registered in the name of the employee or employer. Fixed telephone allowance is fully taxable.", "Limited to only 1 line for each category of assets"],
  ["5", "Perquisite provided pursuant to employment for past achievement award, service excellence / innovation / productivity award, or long service award where the employee has exercised employment for more than 10 years with the same employer.", "RM2,000"],
  ["6", "Parking rate and parking allowance, including parking rate paid by employer directly to the parking operator.", "Restricted to the actual amount expended"],
  ["7", "Meal allowance received on a regular basis at the same rate to all employees. Overtime, outstation, overseas trip and similar meal allowance is exempted only if based on the employer's internal circular or written instruction.", ""],
  ["8", "Subsidised interest for housing, education or car loan is fully exempted if aggregate loans do not exceed RM300,000. Where aggregate loans exceed RM300,000, the exemption is limited by the formula A x B / C as stated in the PDF.", "Subject to formula / RM300,000 threshold"],
  ["9", "PTPTN educational loan paid by employer on behalf of an employee who is a Malaysian citizen, works full-time and is not the employer's relative. Applies under P.U. (A) 205/2019 and P.U. (A) 414/2019 for YA 2019 to YA 2021.", "Refer to statutory conditions"],
];
notes.getRange("A11:C11").merge();
notes.getRange("A11").values = [["The above exemptions are not applicable to employees having control over the company, sole proprietors or partners of partnership businesses."]];
notes.getRange("A11").format = {
  fill: "#FCE4D6",
  font: { bold: true, color: "#7F1D1D" },
  wrapText: true,
};
notes.getRange("A:C").format.wrapText = true;
notes.getRange("A:A").format.columnWidthPx = 55;
notes.getRange("B:B").format.columnWidthPx = 740;
notes.getRange("C:C").format.columnWidthPx = 210;
notes.getRange("A2:A10").format = { horizontalAlignment: "center", verticalAlignment: "top" };
notes.getRange("B2:C10").format = { verticalAlignment: "top", wrapText: true };
notes.getRange("A1:C11").format.autofitRows();
notes.freezePanes.freezeRows(1);

await fs.mkdir(outputDir, { recursive: true });

const preview1 = await workbook.render({ sheetName: "EA 2020", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/ea-preview.png`, new Uint8Array(await preview1.arrayBuffer()));
const preview2 = await workbook.render({ sheetName: "Exemption Notes", range: "A1:C11", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/notes-preview.png`, new Uint8Array(await preview2.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
