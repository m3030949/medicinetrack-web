export type SessionStatus =
  | 'INITIATED'
  | 'OUTER_SCANNED'
  | 'PATIENT_SELECTED'
  | 'INNER_VERIFIED'
  | 'CLINICALLY_VERIFIED'
  | 'ADMINISTERED'
  | 'NOT_ADMINISTERED'
  | 'CANCELLED'
  | 'PARTIALLY_ADMINISTERED'
  | 'EXPIRED';

export interface ActivePrescriptionItem {
  id: string;
  medicineId: string;
  prescribedDose: string;
  doseUnit: string;
  route: string;
  frequency: string | null;
  scheduledAt: string | null;
  administrationInstructions: string | null;
  medicine: {
    id: string;
    medicineCode: string;
    medicineName: string;
    strength: string;
    dosageForm: string;
  };
}

export interface ActivePrescription {
  id: string;
  prescriptionReference: string;
  prescribingClinician: string;
  prescribedAt: string;
  validUntil: string | null;
  items: ActivePrescriptionItem[];
}

export interface SessionDetail {
  id: string;
  status: SessionStatus;
  startedAt: string;
  expiresAt: string;
  completedAt: string | null;
  hospital: { id: string; code: string; name: string };
  nurse: { id: string; fullName: string; employeeCode: string | null };
  patient: {
    id: string;
    patientNumber: string;
    patientName: string;
  } | null;
  package: {
    id: string;
    packageSerial: string;
    medicine: {
      id: string;
      medicineCode: string;
      medicineName: string;
      genericName: string;
      strength: string;
      dosageForm: string;
      manufacturer: string;
      storageRequirements: string | null;
    };
    batch: {
      id: string;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      status: string;
    };
  } | null;
  clinicalVerification: {
    prescriptionId: string;
    verifiedAt: string;
    verificationData: {
      prescriptionItemId: string;
      prescribedDose: string;
      doseUnit: string;
      route: string;
    };
    prescription: ActivePrescription;
  } | null;
  administration: {
    id: string;
    referenceCode: string;
    administrationStatus: string;
    actualDose: string | null;
    actualDoseUnit: string | null;
    route: string | null;
    administrationSite: string | null;
    administeredAt: string | null;
    createdAt: string;
  } | null;
}

