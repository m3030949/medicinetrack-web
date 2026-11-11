import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  QrCode,
  ShieldAlert,
  Syringe,
  UserCheck,
  XCircle,
} from 'lucide-react';
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QrCameraScanner } from '@/components/clinical/QrCameraScanner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { apiClient, extractApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const WORKFLOW_STEPS = [
  { key: 'OUTER', label: '1. Outside QR' },
  { key: 'PATIENT', label: '2. Patient Information' },
  { key: 'INNER', label: '3. Inside QR' },
  { key: 'CLINICAL', label: '4. Clinical Verification' },
  { key: 'CONFIRM', label: '5. Administration Confirmation' },
];

const stepIndexFromStatus = (status) => {
  switch (status) {
    case 'INITIATED':
      return 0;
    case 'OUTER_SCANNED':
      return 1;
    case 'PATIENT_SELECTED':
      return 2;
    case 'INNER_VERIFIED':
      return 3;
    case 'CLINICALLY_VERIFIED':
      return 4;
    default:
      return 4;
  }
};

export const AdministrationWizardPage = () => {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [errorMsg, setErrorMsg] = React.useState(null);
  const [successBanner, setSuccessBanner] = React.useState(null);

  // Step 2: Patient Info state
  const [patientNumber, setPatientNumber] = React.useState('');
  const [patientName, setPatientName] = React.useState('');
  const [patientLookupStatus, setPatientLookupStatus] = React.useState('IDLE');
  const [confirmPatient, setConfirmPatient] = React.useState(false);

  // Step 4: Clinical Verification state
  const [selectedRxId, setSelectedRxId] = React.useState('');
  const [selectedItemId, setSelectedItemId] = React.useState('');
  const [checks, setChecks] = React.useState({
    correctPatientVerified: false,
    correctMedicineVerified: false,
    correctDoseVerified: false,
    correctRouteVerified: false,
    prescriptionVerified: false,
    allergyAndContraindicationChecked: false,
    packagingIntegrityChecked: false,
    expiryDateChecked: false,
  });

  // Step 5: Final Confirmation state
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [notAdminDialogOpen, setNotAdminDialogOpen] = React.useState(false);
  const [outcome, setOutcome] = React.useState('ADMINISTERED');
  const [actualDose, setActualDose] = React.useState('');
  const [actualDoseUnit, setActualDoseUnit] = React.useState('');
  const [remainingDose, setRemainingDose] = React.useState('');
  const [route, setRoute] = React.useState('');
  const [administrationSite, setAdministrationSite] = React.useState('');
  const [partialReason, setPartialReason] = React.useState('');
  const [notAdminReason, setNotAdminReason] = React.useState('');
  const [packageSafeAndUnused, setPackageSafeAndUnused] = React.useState(false);
  const [idempotencyKey] = React.useState(() =>
    typeof crypto !== 'undefined' && crypto?.randomUUID
      ? crypto.randomUUID()
      : `adm-${Date.now()}`,
  );

  const { data: session, isLoading } = useQuery({
    queryKey: ['administration-session', sessionId],
    enabled: Boolean(sessionId),
    queryFn: async () => {
      const res = await apiClient.get(`/administrations/sessions/${sessionId}`);
      return res.data;
    },
  });

  const { data: activePrescriptions = [] } = useQuery({
    queryKey: ['patient-active-rx', session?.patient?.id],
    enabled: Boolean(
      session?.patient?.id && session.status === 'INNER_VERIFIED',
    ),
    queryFn: async () => {
      const res = await apiClient.get(
        `/prescriptions/patient/${session.patient.id}/active`,
      );
      return res.data;
    },
  });

  // Pre-fill Step 5 defaults from verified prescription
  React.useEffect(() => {
    if (session?.clinicalVerification && !actualDose) {
      const vd = session.clinicalVerification.verificationData;
      setActualDose(vd.prescribedDose);
      setActualDoseUnit(vd.doseUnit);
      setRoute(vd.route);
    }
  }, [session, actualDose]);

  // Redirect to success page if already finalized
  React.useEffect(() => {
    if (
      session &&
      (session.status === 'ADMINISTERED' ||
        session.status === 'PARTIALLY_ADMINISTERED' ||
        session.status === 'NOT_ADMINISTERED')
    ) {
      navigate(`/nurse/administer/${session.id}/success`, { replace: true });
    }
  }, [session, navigate]);

  const invalidateSession = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['administration-session', sessionId],
    });
  };

  const scanOuterMutation = useMutation({
    mutationFn: (token) =>
      apiClient.post(`/administrations/${sessionId}/scan-outer`, { token }),
    onSuccess: async () => {
      setErrorMsg(null);
      setSuccessBanner('Outside medicine QR verified and package reserved.');
      await invalidateSession();
    },
    onError: (err) => {
      setSuccessBanner(null);
      setErrorMsg(extractApiError(err));
    },
  });

  const verifyPatientLookup = async () => {
    setErrorMsg(null);
    setSuccessBanner(null);
    try {
      const res = await apiClient.post('/patients/verify', {
        patientNumber,
        patientName: patientName || undefined,
      });
      if (res.data.exists && res.data.patient) {
        setPatientName(res.data.patient.patientName);
        setPatientLookupStatus('FOUND');
      } else {
        setPatientLookupStatus('NOT_FOUND');
      }
    } catch (err) {
      setPatientLookupStatus('MISMATCH');
      setErrorMsg(extractApiError(err));
    }
  };

  const selectPatientMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/administrations/${sessionId}/select-patient`, {
        patientNumber,
        patientName,
        confirmIdentity: confirmPatient,
      }),
    onSuccess: async () => {
      setErrorMsg(null);
      setSuccessBanner('Patient identity confirmed.');
      await invalidateSession();
    },
    onError: (err) => {
      setSuccessBanner(null);
      setErrorMsg(extractApiError(err));
    },
  });

  const scanInnerMutation = useMutation({
    mutationFn: (token) =>
      apiClient.post(`/administrations/${sessionId}/scan-inner`, { token }),
    onSuccess: async () => {
      setErrorMsg(null);
      setSuccessBanner(
        'Inside vial QR matched with outside package successfully.',
      );
      await invalidateSession();
    },
    onError: (err) => {
      setSuccessBanner(null);
      setErrorMsg(extractApiError(err));
    },
  });

  const clinicalMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/administrations/${sessionId}/clinical-verification`, {
        prescriptionId: selectedRxId,
        prescriptionItemId: selectedItemId,
        checks,
      }),
    onSuccess: async () => {
      setErrorMsg(null);
      setSuccessBanner('Clinical verification passed.');
      await invalidateSession();
    },
    onError: (err) => {
      setSuccessBanner(null);
      setErrorMsg(extractApiError(err));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/administrations/${sessionId}/confirm`,
        {
          idempotencyKey,
          outcome,
          actualDose: Number(actualDose),
          actualDoseUnit,
          remainingDose:
            outcome === 'PARTIALLY_ADMINISTERED'
              ? Number(remainingDose)
              : undefined,
          route,
          administrationSite: administrationSite || undefined,
          reason:
            outcome === 'PARTIALLY_ADMINISTERED' ? partialReason : undefined,
          finalConfirmation: true,
        },
        { headers: { 'Idempotency-Key': idempotencyKey } },
      ),
    onSuccess: () => {
      setConfirmDialogOpen(false);
      navigate(`/nurse/administer/${sessionId}/success`, { replace: true });
    },
    onError: (err) => {
      setConfirmDialogOpen(false);
      setErrorMsg(extractApiError(err));
    },
  });

  const notAdminMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/administrations/${sessionId}/not-administered`, {
        idempotencyKey: `na-${idempotencyKey}`,
        reason: notAdminReason,
        packageSafeAndUnused,
      }),
    onSuccess: () => {
      setNotAdminDialogOpen(false);
      navigate(`/nurse/administer/${sessionId}/success`, { replace: true });
    },
    onError: (err) => {
      setNotAdminDialogOpen(false);
      setErrorMsg(extractApiError(err));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/administrations/${sessionId}/cancel`, {
        reason: 'Cancelled by nurse in workflow UI',
      }),
    onSuccess: () => navigate('/nurse/dashboard'),
    onError: (err) => setErrorMsg(extractApiError(err)),
  });

  if (isLoading || !session) {
    return (
      <div className="py-12 text-center text-sm text-slate-600">
        Loading clinical workflow session...
      </div>
    );
  }

  if (session.status === 'CANCELLED' || session.status === 'EXPIRED') {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Session {session.status}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            This administration session is {session.status.toLowerCase()} and
            any package reservation has been released.
          </p>
          <Button onClick={() => navigate('/nurse/dashboard')}>
            Return to Nurse Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const activeStep = stepIndexFromStatus(session.status);
  const allChecksDone = Object.values(checks).every(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            {session.hospital.name} · {session.nurse.fullName}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Injection Administration Workflow
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => cancelMutation.mutate()}
          disabled={cancelMutation.isPending}
        >
          <XCircle className="h-4 w-4" />
          Cancel Workflow
        </Button>
      </div>

      {/* 5-Step Progress Stepper */}
      <ol
        aria-label="Administration Progress"
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
      >
        {WORKFLOW_STEPS.map((step, idx) => {
          const completed = idx < activeStep;
          const current = idx === activeStep;
          return (
            <li
              key={step.key}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors',
                current
                  ? 'border-teal-600 bg-teal-50 text-teal-900'
                  : completed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-400',
              )}
            >
              {step.label}
            </li>
          );
        })}
      </ol>

      {successBanner && (
        <Alert variant="success" className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successBanner}</span>
        </Alert>
      )}
      {errorMsg && (
        <Alert variant="destructive" className="flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </Alert>
      )}

      {/* STEP 1: SCAN OUTSIDE QR */}
      {session.status === 'INITIATED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-teal-700" />
              Scan Outside Medicine QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QrCameraScanner
              scannerId="qr-outer-scanner"
              label="Outside Box QR Token"
              instructions="Scan the QR code affixed to the OUTSIDE medicine carton before opening the inner vial."
              isSubmitting={scanOuterMutation.isPending}
              onScan={(token) => scanOuterMutation.mutate(token)}
            />
          </CardContent>
        </Card>
      )}

      {/* Verified Medicine Banner (visible in Steps 2-4) */}
      {session.package && session.status !== 'CLINICALLY_VERIFIED' && (
        <Card className="border-teal-200 bg-teal-50/40">
          <CardContent className="p-4 grid gap-2 sm:grid-cols-4 text-xs">
            <div>
              <span className="text-slate-500 block">Medicine</span>
              <span className="font-semibold text-slate-900">
                {session.package.medicine.medicineName} (
                {session.package.medicine.strength})
              </span>
              <span className="block text-slate-600">
                {session.package.medicine.genericName} ·{' '}
                {session.package.medicine.dosageForm}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Manufacturer</span>
              <span className="font-medium text-slate-800">
                {session.package.medicine.manufacturer}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Batch & Expiry</span>
              <span className="font-mono font-semibold text-slate-900">
                {session.package.batch.batchNumber}
              </span>
              <span className="block text-slate-700">
                Exp: {session.package.batch.expiryDate.slice(0, 10)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Package Serial</span>
              <span className="font-mono font-semibold text-slate-900">
                {session.package.packageSerial}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: ENTER PATIENT INFORMATION */}
      {session.status === 'OUTER_SCANNED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-700" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="patientNumber">Patient ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="patientNumber"
                    placeholder="PAT-2026-001"
                    value={patientNumber}
                    onChange={(e) => {
                      setPatientNumber(e.target.value);
                      setPatientLookupStatus('IDLE');
                      setConfirmPatient(false);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!patientNumber.trim()}
                    onClick={() => void verifyPatientLookup()}
                  >
                    Lookup
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  placeholder="Enter patient full name"
                  value={patientName}
                  onChange={(e) => {
                    setPatientName(e.target.value);
                    setConfirmPatient(false);
                  }}
                />
              </div>
            </div>

            {patientLookupStatus === 'FOUND' && (
              <Alert variant="success">
                Existing hospital patient found: <strong>{patientName}</strong>{' '}
                ({patientNumber.toUpperCase()}). Verify wristband and confirm
                below.
              </Alert>
            )}
            {patientLookupStatus === 'NOT_FOUND' && (
              <Alert variant="default">
                Patient ID not yet registered in {session.hospital.name}.
                Confirming below will register this new patient record.
              </Alert>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="text-xs text-slate-600">
                Hospital: <strong>{session.hospital.name}</strong> · Patient ID:{' '}
                <strong className="font-mono">
                  {patientNumber.trim().toUpperCase() || '—'}
                </strong>{' '}
                · Name: <strong>{patientName.trim() || '—'}</strong>
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmPatient}
                  onChange={(e) => setConfirmPatient(e.target.checked)}
                />
                I confirm the Patient ID and Patient Name match the patient.
              </label>
            </div>

            <Button
              size="lg"
              disabled={
                !patientNumber.trim() ||
                !patientName.trim() ||
                !confirmPatient ||
                selectPatientMutation.isPending
              }
              onClick={() => selectPatientMutation.mutate()}
            >
              {selectPatientMutation.isPending
                ? 'Confirming Patient...'
                : patientLookupStatus === 'NOT_FOUND'
                  ? 'Register New Patient & Continue'
                  : 'Confirm Patient & Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: SCAN INSIDE QR */}
      {session.status === 'PATIENT_SELECTED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-teal-700" />
              Scan Inside Medicine QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {session.patient && (
              <div className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm">
                Verified Patient: <strong>{session.patient.patientName}</strong>{' '}
                (<span className="font-mono">{session.patient.patientNumber}</span>)
              </div>
            )}
            <QrCameraScanner
              scannerId="qr-inner-scanner"
              label="Inside Vial QR Token"
              instructions="Open the box and scan the QR code attached directly to the INSIDE medicine vial to verify it matches the outer package."
              isSubmitting={scanInnerMutation.isPending}
              onScan={(token) => scanInnerMutation.mutate(token)}
            />
          </CardContent>
        </Card>
      )}

      {/* STEP 4: CLINICAL VERIFICATION */}
      {session.status === 'INNER_VERIFIED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-700" />
              Clinical Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {activePrescriptions.length === 0 ? (
              <Alert variant="warning">
                No active controlled prescription found for{' '}
                {session.patient?.patientName}. Request a clinician or hospital
                admin to enter an active prescription before administration, or
                record as Not Administered.
              </Alert>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rxItemSelect">
                  Select Matching Active Prescription Order
                </Label>
                <Select
                  id="rxItemSelect"
                  value={
                    selectedRxId && selectedItemId
                      ? `${selectedRxId}::${selectedItemId}`
                      : ''
                  }
                  onChange={(e) => {
                    const [rxId, itemId] = e.target.value.split('::');
                    setSelectedRxId(rxId ?? '');
                    setSelectedItemId(itemId ?? '');
                  }}
                >
                  <option value="">Select prescription order...</option>
                  {activePrescriptions.flatMap((rx) =>
                    rx.items.map((item) => (
                      <option key={item.id} value={`${rx.id}::${item.id}`}>
                        {rx.prescriptionReference} — {item.medicine.medicineName}{' '}
                        ({item.prescribedDose} {item.doseUnit}, {item.route}) ·{' '}
                        {rx.prescribingClinician}
                      </option>
                    )),
                  )}
                </Select>
              </div>
            )}

            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                ['correctPatientVerified', 'Correct patient verified'],
                ['correctMedicineVerified', 'Correct medicine verified'],
                ['correctDoseVerified', 'Correct dose verified'],
                ['correctRouteVerified', 'Correct route verified'],
                ['prescriptionVerified', 'Prescription verified'],
                [
                  'allergyAndContraindicationChecked',
                  'Allergy and contraindication checks completed',
                ],
                [
                  'packagingIntegrityChecked',
                  'Medicine packaging integrity checked',
                ],
                ['expiryDateChecked', 'Expiry date checked'],
              ].map(([field, text]) => (
                <label
                  key={field}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-3 text-sm cursor-pointer hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={checks[field]}
                    onChange={(e) =>
                      setChecks((prev) => ({
                        ...prev,
                        [field]: e.target.checked,
                      }))
                    }
                  />
                  <span>{text}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                disabled={
                  !selectedRxId ||
                  !selectedItemId ||
                  !allChecksDone ||
                  clinicalMutation.isPending
                }
                onClick={() => clinicalMutation.mutate()}
              >
                {clinicalMutation.isPending
                  ? 'Validating...'
                  : 'Complete Clinical Verification'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setNotAdminDialogOpen(true)}
              >
                Escalate / Not Administered
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 5: CONFIRM INJECTION ADMINISTRATION */}
      {session.status === 'CLINICALLY_VERIFIED' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Syringe className="h-5 w-5 text-teal-700" />
              Confirm Injection Administration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Patient Details
                </div>
                <div className="font-semibold">
                  {session.patient?.patientName}
                </div>
                <div className="font-mono text-xs text-slate-600">
                  ID: {session.patient?.patientNumber} · {session.hospital.name}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Medicine & Dual-QR Verification
                </div>
                <div className="font-semibold">
                  {session.package?.medicine.medicineName} (
                  {session.package?.medicine.strength})
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  Batch {session.package?.batch.batchNumber} ·{' '}
                  {session.package?.packageSerial}
                </div>
                <div className="mt-1 flex gap-1.5">
                  <Badge>Outside QR: Verified</Badge>
                  <Badge>Inside QR: Verified</Badge>
                  <Badge>Match: Verified</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="outcome">Administration Outcome</Label>
                <Select
                  id="outcome"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="ADMINISTERED">Full Dose Administered</option>
                  <option value="PARTIALLY_ADMINISTERED">
                    Partially Administered
                  </option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actualDose">Actual Dose</Label>
                <Input
                  id="actualDose"
                  type="number"
                  step="any"
                  value={actualDose}
                  onChange={(e) => setActualDose(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="actualDoseUnit">Unit</Label>
                <Input
                  id="actualDoseUnit"
                  value={actualDoseUnit}
                  onChange={(e) => setActualDoseUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="route">Route</Label>
                <Input
                  id="route"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="site">Administration Site</Label>
                <Input
                  id="site"
                  placeholder="e.g. Left Deltoid / Peripheral IV"
                  value={administrationSite}
                  onChange={(e) => setAdministrationSite(e.target.value)}
                />
              </div>
            </div>

            {outcome === 'PARTIALLY_ADMINISTERED' && (
              <div className="grid gap-3 sm:grid-cols-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="remainingDose">Remaining / Wasted Dose</Label>
                  <Input
                    id="remainingDose"
                    type="number"
                    step="any"
                    value={remainingDose}
                    onChange={(e) => setRemainingDose(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="partialReason">Reason & Disposal Note</Label>
                  <Input
                    id="partialReason"
                    value={partialReason}
                    onChange={(e) => setPartialReason(e.target.value)}
                    placeholder="Stopped halfway due to patient reaction"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                size="lg"
                disabled={!actualDose || !actualDoseUnit || !route}
                onClick={() => setConfirmDialogOpen(true)}
              >
                Confirm Administered
              </Button>
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setNotAdminDialogOpen(true)}
              >
                Not Administered
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Irreversible Final Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-teal-700" />
              Confirm Physical Injection Completed
            </DialogTitle>
            <DialogDescription>
              Only confirm after the injection has actually been administered to{' '}
              <strong>{session.patient?.patientName}</strong>. This permanently
              consumes package{' '}
              <strong className="font-mono">
                {session.package?.packageSerial}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              {confirmMutation.isPending
                ? 'Saving Transaction...'
                : 'Yes, Injection Administered'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Not Administered Modal */}
      <Dialog open={notAdminDialogOpen} onOpenChange={setNotAdminDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Injection Not Administered</DialogTitle>
            <DialogDescription>
              Document why the injection was withheld while preserving all scan
              and verification history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notAdminReason">Mandatory Reason</Label>
              <Input
                id="notAdminReason"
                value={notAdminReason}
                onChange={(e) => setNotAdminReason(e.target.value)}
                placeholder="Patient refused / clinical hold by physician"
              />
            </div>
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={packageSafeAndUnused}
                onChange={(e) => setPackageSafeAndUnused(e.target.checked)}
              />
              <span>
                Vial and sterile seal remain completely unopened, safe, and
                unused (release reservation back to hospital stock).
              </span>
            </label>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setNotAdminDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={
                  notAdminReason.trim().length < 3 || notAdminMutation.isPending
                }
                onClick={() => notAdminMutation.mutate()}
              >
                Save Not Administered
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

