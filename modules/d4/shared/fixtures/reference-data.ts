import type { ReferenceDataRepository } from "../services";
import type { ReferenceDataSnapshot } from "../types";

/**
 * Fictional D4 data only. No production or Supabase records are stored here.
 *
 * Structure follows the Andima files: departments, position titles, reporting lines and Employee IDs
 * from OrganizationalStructureData_PTANDIMATRANSPORTINDO_UAJY_APPROVED_V1 (sheets 01_ORG_MASTER and
 * 02_ROLE_RESP), KPI from KPI Scorecard V5.1. People keep the placeholder names of that file
 * (Alfa … Oscar in Sales Administration Team 2, Sun and Mercury in Human Capital & Culture). Rows whose
 * name in the file is a real person get a placeholder instead (Romeo, Quebec, Lima, Kilo, Tango), so no
 * real staff name appears in the preview. Position titles that already exist in d3_positions use the
 * same spelling ("Accounting Associate (Billing)", "Sales Executive", "Tax Associate").
 */
const id = (n: number) => `d4000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const DEPT = { finance: id(7), commercial: id(46), humanCapital: id(48) } as const;
const POS = {
  salesAdmin: id(8), salesExecutive: id(17), hrManager: id(18), hrAssociate: id(19),
  accounting: id(44), tax: id(45),
} as const;
const COMP = {
  customerCommunication: id(4), documentAccuracy: id(22), erpJobInput: id(23), billingReadyData: id(24),
  kpiAdministration: id(25), accountManagement: id(26), invoicing: id(57), taxDocuments: id(58),
} as const;

export const d4ReferenceFixture: ReferenceDataSnapshot = {
  source: "fixture",
  departments: [
    { id: DEPT.finance, code: "FAT", name: "Finance, Accounting & Tax" },
    { id: DEPT.commercial, code: "COM", name: "Commercial & Customer Success" },
    { id: DEPT.humanCapital, code: "HCC", name: "Human Capital & Culture" },
  ],
  // Codes are the role codes of sheet 02_ROLE_RESP.
  positions: [
    { id: POS.salesAdmin, code: "ROLE-015", title: "Sales Administration Associate", departmentId: DEPT.commercial },
    { id: POS.salesExecutive, code: "ROLE-016", title: "Sales Executive", departmentId: DEPT.commercial },
    { id: POS.hrManager, code: "ROLE-018", title: "HR Manager", departmentId: DEPT.humanCapital },
    { id: POS.hrAssociate, code: "ROLE-020", title: "HR Associate Officer", departmentId: DEPT.humanCapital },
    { id: POS.accounting, code: "ROLE-006", title: "Accounting Associate (Billing)", departmentId: DEPT.finance },
    { id: POS.tax, code: "ROLE-011", title: "Tax Associate", departmentId: DEPT.finance },
  ],
  // employeeId = Employee ID in 01_ORG_MASTER.
  employees: [
    { id: id(9), employeeId: "COM-SA-02-01", fullName: "Alfa", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(10), employeeId: "COM-SA-02-02", fullName: "Bravo", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(11), employeeId: "COM-SA-02-03", fullName: "Charlie", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(13), employeeId: "COM-SA-02-04", fullName: "Delta", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(14), employeeId: "COM-SA-02-05", fullName: "Echo", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(15), employeeId: "COM-SA-02-06", fullName: "Fanta", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(16), employeeId: "COM-SA-02-07", fullName: "Holly", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(49), employeeId: "COM-SA-02-12", fullName: "Oscar", positionId: POS.salesAdmin, departmentId: DEPT.commercial },
    { id: id(50), employeeId: "COM-SLS-002", fullName: "Romeo", positionId: POS.salesExecutive, departmentId: DEPT.commercial },
    { id: id(12), employeeId: "HCC-HRA-002", fullName: "Mercury", positionId: POS.hrAssociate, departmentId: DEPT.humanCapital },
    { id: id(51), employeeId: "HCC-HRA-001", fullName: "Sun", positionId: POS.hrAssociate, departmentId: DEPT.humanCapital },
    { id: id(53), employeeId: "HCC-HR-MGR-001", fullName: "Quebec", positionId: POS.hrManager, departmentId: DEPT.humanCapital },
    { id: id(54), employeeId: "FAT-BIL-001", fullName: "Lima", positionId: POS.accounting, departmentId: DEPT.finance },
    { id: id(55), employeeId: "FAT-BIL-002", fullName: "Kilo", positionId: POS.accounting, departmentId: DEPT.finance },
    { id: id(56), employeeId: "FAT-TAX-ASC-001", fullName: "Tango", positionId: POS.tax, departmentId: DEPT.finance },
  ],
  // Derived from the core responsibilities of each role in 02_ROLE_RESP.
  competencies: [
    { id: COMP.customerCommunication, code: "COMP-COM-01", name: "Komunikasi Pelanggan", category: "Soft skill" },
    { id: COMP.documentAccuracy, code: "COMP-COM-02", name: "Akurasi Dokumen & Worksheet", category: "Technical" },
    { id: COMP.erpJobInput, code: "COMP-COM-03", name: "Input ERP & Job Number", category: "Technical" },
    { id: COMP.billingReadyData, code: "COMP-COM-04", name: "Penyiapan Data Siap Tagih", category: "Technical" },
    { id: COMP.kpiAdministration, code: "COMP-HCC-01", name: "Administrasi KPI & Penilaian Kinerja", category: "Technical" },
    { id: COMP.accountManagement, code: "COMP-COM-05", name: "Manajemen Akun Pelanggan", category: "Technical" },
    { id: COMP.invoicing, code: "COMP-FAT-01", name: "Penerbitan & Revisi Invoice", category: "Technical" },
    { id: COMP.taxDocuments, code: "COMP-FAT-02", name: "Verifikasi Faktur & Dokumen PPN", category: "Technical" },
  ],
  positionRequirements: [
    // Sales Administration Associate: input customer requests into ERP; prepare worksheet & Job Number; complete documents; prepare billing-ready data.
    { id: id(27), positionId: POS.salesAdmin, competencyId: COMP.customerCommunication, minProficiencyLevel: 3, isMandatory: true },
    { id: id(28), positionId: POS.salesAdmin, competencyId: COMP.documentAccuracy, minProficiencyLevel: 4, isMandatory: true },
    { id: id(29), positionId: POS.salesAdmin, competencyId: COMP.erpJobInput, minProficiencyLevel: 3, isMandatory: true },
    { id: id(31), positionId: POS.salesAdmin, competencyId: COMP.billingReadyData, minProficiencyLevel: 3, isMandatory: true },
    // Sales Executive: manage customer accounts; review worksheet accuracy; resolve customer issues.
    { id: id(30), positionId: POS.salesExecutive, competencyId: COMP.accountManagement, minProficiencyLevel: 4, isMandatory: true },
    { id: id(61), positionId: POS.salesExecutive, competencyId: COMP.customerCommunication, minProficiencyLevel: 4, isMandatory: true },
    { id: id(64), positionId: POS.salesExecutive, competencyId: COMP.documentAccuracy, minProficiencyLevel: 4, isMandatory: true },
    // HR Associate Officer (Learning, Development & Performance): KPI administration; performance review support.
    { id: id(32), positionId: POS.hrAssociate, competencyId: COMP.kpiAdministration, minProficiencyLevel: 3, isMandatory: true },
    // HR Manager: training & assessment; KPI monitoring.
    { id: id(62), positionId: POS.hrManager, competencyId: COMP.kpiAdministration, minProficiencyLevel: 4, isMandatory: true },
    // Accounting Associate (Billing): create invoices; invoice revision; invoice closing.
    { id: id(33), positionId: POS.accounting, competencyId: COMP.invoicing, minProficiencyLevel: 3, isMandatory: true },
    // Tax Associate: invoice verification; VAT documents; tax invoices.
    { id: id(63), positionId: POS.tax, competencyId: COMP.taxDocuments, minProficiencyLevel: 3, isMandatory: true },
  ],
  // Evidence refers to Andima sample documents: worksheet AENAT/2609/0354 (Transaction Order TRX-0926-00627)
  // and reimbursement invoice 26 28597A. A skill without evidence yields "Data Belum Cukup", never "Gap".
  employeeSkills: [
    // Alfa: open Gap on document accuracy (level 2 of min. 4); no record yet for ERP input.
    { id: id(34), employeeId: id(9), competencyId: COMP.customerCommunication, proficiencyLevel: 4, evidenceNotes: "Follow-up attention MS. CHRIS / MS ANIEZ pada job AENAT/2609/0354 tercatat lengkap." },
    { id: id(35), employeeId: id(9), competencyId: COMP.documentAccuracy, proficiencyLevel: 2, evidenceNotes: "Worksheet AENAT/2609/0354 direvisi dua kali (Chargeable Weight dan Reference No. kosong)." },
    { id: id(65), employeeId: id(9), competencyId: COMP.billingReadyData, proficiencyLevel: 3, evidenceNotes: "Data reimbursement RA CMU dan Warehouse Garuda siap tagih H+1." },
    { id: id(36), employeeId: id(10), competencyId: COMP.customerCommunication, proficiencyLevel: 4, evidenceNotes: "Survei klien Q3: respons < 2 jam." },
    { id: id(66), employeeId: id(10), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "12 worksheet September tanpa revisi." },
    { id: id(67), employeeId: id(10), competencyId: COMP.erpJobInput, proficiencyLevel: 4, evidenceNotes: "Job Number ERP terbit di hari order masuk." },
    { id: id(68), employeeId: id(10), competencyId: COMP.billingReadyData, proficiencyLevel: 3, evidenceNotes: "Data siap tagih lengkap untuk 10 dari 11 job." },
    { id: id(69), employeeId: id(10), competencyId: COMP.accountManagement, proficiencyLevel: 3, evidenceNotes: "Mendampingi Sales Executive 2 pada dua akun pelanggan." },
    // Charlie: Gap on billing-ready data (level 2 of min. 3).
    { id: id(37), employeeId: id(11), competencyId: COMP.billingReadyData, proficiencyLevel: 2, evidenceNotes: "3 job September tertahan billing karena dokumen reimbursement belum lengkap." },
    { id: id(70), employeeId: id(11), competencyId: COMP.customerCommunication, proficiencyLevel: 3, evidenceNotes: "Catatan follow-up pelanggan rapi." },
    { id: id(71), employeeId: id(11), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Worksheet sesuai MAWB/HAWB." },
    { id: id(72), employeeId: id(11), competencyId: COMP.erpJobInput, proficiencyLevel: 3, evidenceNotes: "Input order ERP sesuai SOP." },
    { id: id(38), employeeId: id(13), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Audit worksheet Agustus: 0 temuan." },
    { id: id(73), employeeId: id(13), competencyId: COMP.customerCommunication, proficiencyLevel: 4, evidenceNotes: "Pujian tertulis dari pelanggan." },
    { id: id(74), employeeId: id(13), competencyId: COMP.erpJobInput, proficiencyLevel: 4, evidenceNotes: "Status job ERP selalu terbarui." },
    { id: id(75), employeeId: id(13), competencyId: COMP.billingReadyData, proficiencyLevel: 4, evidenceNotes: "Seluruh job siap tagih H+1." },
    // Echo: Gap on document accuracy (level 3 of min. 4).
    { id: id(39), employeeId: id(14), competencyId: COMP.documentAccuracy, proficiencyLevel: 3, evidenceNotes: "2 worksheet September perlu revisi Gross Weight." },
    { id: id(76), employeeId: id(14), competencyId: COMP.customerCommunication, proficiencyLevel: 3, evidenceNotes: "Follow-up pelanggan sesuai jadwal." },
    { id: id(77), employeeId: id(14), competencyId: COMP.erpJobInput, proficiencyLevel: 3, evidenceNotes: "Job Number terbit tepat waktu." },
    { id: id(78), employeeId: id(14), competencyId: COMP.billingReadyData, proficiencyLevel: 3, evidenceNotes: "Data siap tagih lengkap." },
    // Fanta: billing-ready data has no evidence yet → Data Belum Cukup.
    { id: id(40), employeeId: id(15), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Worksheet lengkap dan konsisten." },
    { id: id(79), employeeId: id(15), competencyId: COMP.customerCommunication, proficiencyLevel: 3, evidenceNotes: "Catatan komunikasi pelanggan lengkap." },
    { id: id(80), employeeId: id(15), competencyId: COMP.erpJobInput, proficiencyLevel: 3, evidenceNotes: "Input ERP sesuai SOP." },
    { id: id(81), employeeId: id(15), competencyId: COMP.billingReadyData, proficiencyLevel: 3, evidenceNotes: null },
    // Holly: ERP input has no evidence yet → Data Belum Cukup.
    { id: id(41), employeeId: id(16), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Worksheet dan dokumen pendukung lengkap." },
    { id: id(42), employeeId: id(16), competencyId: COMP.erpJobInput, proficiencyLevel: 3, evidenceNotes: null },
    { id: id(82), employeeId: id(16), competencyId: COMP.customerCommunication, proficiencyLevel: 3, evidenceNotes: "Follow-up pelanggan tercatat." },
    { id: id(83), employeeId: id(16), competencyId: COMP.billingReadyData, proficiencyLevel: 3, evidenceNotes: "Data reimbursement siap tagih." },
    { id: id(84), employeeId: id(49), competencyId: COMP.customerCommunication, proficiencyLevel: 4, evidenceNotes: "Respons pelanggan < 2 jam." },
    { id: id(85), employeeId: id(49), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Worksheet tanpa revisi." },
    { id: id(86), employeeId: id(49), competencyId: COMP.erpJobInput, proficiencyLevel: 4, evidenceNotes: "Job Number dan status ERP tepat waktu." },
    { id: id(87), employeeId: id(49), competencyId: COMP.billingReadyData, proficiencyLevel: 4, evidenceNotes: "Seluruh job siap tagih." },
    { id: id(88), employeeId: id(50), competencyId: COMP.accountManagement, proficiencyLevel: 4, evidenceNotes: "Mengelola akun pelanggan Sales Team 2." },
    { id: id(89), employeeId: id(50), competencyId: COMP.customerCommunication, proficiencyLevel: 5, evidenceNotes: "Menyelesaikan eskalasi pelanggan tanpa komplain lanjutan." },
    { id: id(90), employeeId: id(50), competencyId: COMP.documentAccuracy, proficiencyLevel: 4, evidenceNotes: "Review worksheet Sales Admin Team 2." },
    { id: id(91), employeeId: id(12), competencyId: COMP.kpiAdministration, proficiencyLevel: 4, evidenceNotes: "Rekap KPI Scorecard V5.1 periode Q3 selesai tepat waktu." },
    // Sun: Gap on KPI administration (level 2 of min. 3).
    { id: id(92), employeeId: id(51), competencyId: COMP.kpiAdministration, proficiencyLevel: 2, evidenceNotes: "Rekap KPI onboarding masih dibantu Mercury." },
    { id: id(93), employeeId: id(53), competencyId: COMP.kpiAdministration, proficiencyLevel: 5, evidenceNotes: "Memimpin kalibrasi KPI semester." },
    { id: id(94), employeeId: id(54), competencyId: COMP.invoicing, proficiencyLevel: 4, evidenceNotes: "Invoice 26 28597 terbit < 24 jam tanpa revisi." },
    // Kilo: Gap on invoicing (level 2 of min. 3), still open after training (gap closes only by reassessment).
    { id: id(95), employeeId: id(55), competencyId: COMP.invoicing, proficiencyLevel: 2, evidenceNotes: "Invoice reimbursement 26 28597A sempat direvisi (terbilang salah)." },
    { id: id(96), employeeId: id(56), competencyId: COMP.taxDocuments, proficiencyLevel: 3, evidenceNotes: "Verifikasi PPN 11% pada invoice Sales 26 28597 sesuai." },
  ],
};

/** Must be selected explicitly by a feature in development. */
export const fixtureReferenceRepository: ReferenceDataRepository = {
  async loadReferenceData() {
    return d4ReferenceFixture;
  },
};
