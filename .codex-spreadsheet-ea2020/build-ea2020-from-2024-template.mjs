import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = "C:/Users/user/Documents/00-NHL Global Solution/Admin/LHDN/EA-Form-2024-Latest-in-Excel.xlsx";
const outputPath = "C:/Users/user/Documents/00-NHL Global Solution/Admin/LHDN/Form-EA-2020-Pindaan-2017-from-2024-template.xlsx";
const previewPath = "C:/Users/user/Documents/00 Agent Skills/virtual-firm/.codex-spreadsheet-ea2020/outputs/ea2020-template-copy-preview.png";

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("EA");

function set(addr, value) {
  sheet.getRange(addr).values = [[value]];
}

function clear(addr) {
  set(addr, null);
}

// Version/header changes from Form-EA-2020.pdf (C.P.8A - Pin. 2017).
set("A1", "(C.P.8A - Pin. 2017)");
set("W1", "PRIVATE SECTOR Employee's");
set("W2", "Statement of Remuneration");
set("X3", "Employee's Income Tax No.");
set("A5", "Employer's No. E");
set("K5", "FOR THE YEAR ENDED 31 DECEMBER");
set("Z5", "LHDNM Branch");

// Restore Pin. 2017 wording where the 2024 template differs.
set("C10", "Full Name of Employee/Pensioner (Mr./Miss/Madam)");
set("R11", "Staff No./Payroll No.");
set("C14", "Number Of Children");
set("C15", "Qualified For Tax Relief");
set("B19", "(Excluding Tax Exempt Allowances/Perquisites/Gifts/Benefits)");
set("D22", "Gross tips, perquisites, awards/rewards or other allowances (Details of payment:");
set("D23", "Income Tax borne by the Employer in respect of his Employee");
set("C31", "Refund from unapproved Provident/Pension Fund");
set("C36", "Annuities or other Periodical Payments");

set("C41", "Monthly Tax Deductions (MTD) remitted to LHDNM");
set("C42", "CP 38 Deductions");
set("C43", "Zakat paid via salary deduction");
set("C44", "Total claim for deduction by employee via Form TP1 in respect of:");
set("B45", null);
set("C45", "(a)");
set("D45", "Relief");
set("B46", null);
set("C46", "(b)");
set("D46", "Zakat other than that paid via monthly salary deduction");
set("B47", "5.");
set("C47", "Total qualifying child relief");
set("D47", null);
set("B48", null);
set("C48", null);

set("B50", "CONTRIBUTIONS PAID BY EMPLOYEE TO APPROVED PROVIDENT/PENSION FUND AND SOCSO");
set("C52", "Amount of compulsory contribution paid (state the employee's share of contribution only)");
set("C53", "SOCSO : Amount of compulsory contribution paid (state the employee's share of contribution only)");
set("C54", null);
set("B56", "TOTAL TAX EXEMPT ALLOWANCES / PERQUISITES / GIFTS / BENEFITS");

// Clear the filled sample/private values from the 2024 workbook so this becomes a reusable 2020 template.
[
  "A4", "E5", "T5", "X4", "AA5",
  "P10", "G11", "G12", "G13", "J14", "Y13", "Y15",
  "AD20", "W22", "AD22", "P25", "V25", "H27", "H28",
  "AD38", "AD41", "AD42", "AD43", "U45", "U46", "AD47",
  "AD52", "AD53", "AD54", "AC56",
  "R59", "R60", "R61", "R62", "C62",
].forEach(clear);

await fs.mkdir("C:/Users/user/Documents/00 Agent Skills/virtual-firm/.codex-spreadsheet-ea2020/outputs", { recursive: true });
const preview = await workbook.render({ sheetName: "EA", range: "A1:AE62", scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
