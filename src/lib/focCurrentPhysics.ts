// Field-oriented-control (FOC) current relationships for a permanent-magnet
// synchronous motor (PMSM, surface or interior): peak/RMS phase current, the
// rotor (d-q) synchronous reference frame current vector, electromagnetic
// torque, and the maximum-torque-per-ampere (MTPA) operating locus.
//
// Convention: amplitude-invariant Clarke/Park transform (the standard motor-
// control convention, used by every major inverter vendor's FOC application
// notes) — Id and Iq are expressed in the same peak-amplitude units as a
// phase current, so the d-q vector magnitude |Idq| = sqrt(Id^2+Iq^2) equals
// the PEAK phase current, not its RMS value. This is what lets a scalar
// "phase current" rating translate directly onto the d-q plane without an
// extra scaling factor.
//
// Angle convention: the current angle gamma is measured from the d-axis
// (rotor flux axis), counter-clockwise, same as standard atan2(Iq, Id) — the
// textbook convention (Krause; Pillay & Krishnan). Some vendor application
// notes instead quote a "current advance angle" beta measured from the
// q-axis, where beta = 90 deg - gamma; both describe the same vector.
//
// Torque equation and MTPA closed form verified against independent
// published sources (see focCurrentPhysics research) and cross-checked
// numerically against each other before use.
//
// Scope: PMSM only. An induction motor's "Id/Iq" (indirect FOC) has a very
// different, slip- and rotor-time-constant-dependent interpretation and is
// out of scope for this tool.

export interface DqCurrent {
  idA: number; // A, peak (signed — negative for flux-weakening/reluctance-assist)
  iqA: number; // A, peak (signed — positive for forward motoring torque)
}

export interface CurrentMagnitudeAngle {
  magnitudePeakA: number; // A, peak — equals |Idq| under the amplitude-invariant convention
  magnitudeRmsA: number; // A, rms — magnitudePeakA / sqrt(2)
  angleDeg: number; // degrees from the d-axis, counter-clockwise
}

const SQRT2 = Math.SQRT2;

export function peakToRms(peakA: number): number {
  return peakA / SQRT2;
}

export function rmsToPeak(rmsA: number): number {
  return rmsA * SQRT2;
}

/** Id, Iq -> magnitude (peak & rms) and angle from the d-axis. */
export function magnitudeAngleFromDq(dq: DqCurrent): CurrentMagnitudeAngle {
  const magnitudePeakA = Math.hypot(dq.idA, dq.iqA);
  return {
    magnitudePeakA,
    magnitudeRmsA: peakToRms(magnitudePeakA),
    angleDeg: (Math.atan2(dq.iqA, dq.idA) * 180) / Math.PI,
  };
}

/** Magnitude (peak) + angle from the d-axis -> Id, Iq. */
export function dqFromMagnitudeAngle(magnitudePeakA: number, angleDeg: number): DqCurrent {
  const rad = (angleDeg * Math.PI) / 180;
  return { idA: magnitudePeakA * Math.cos(rad), iqA: magnitudePeakA * Math.sin(rad) };
}

export interface PmsmParameters {
  polePairs: number;
  fluxLinkageWb: number; // permanent-magnet flux linkage, Wb (peak, per phase)
  ldH: number; // d-axis synchronous inductance, H
  lqH: number; // q-axis synchronous inductance, H — equal to ldH for a surface-PM motor
}

export interface TorqueBreakdown {
  magnetTorqueNm: number;
  reluctanceTorqueNm: number;
  totalTorqueNm: number;
}

/** T = (3/2)*p*[ lambda_pm*Iq + (Ld-Lq)*Id*Iq ] — magnet + reluctance terms. */
export function pmsmTorque(dq: DqCurrent, motor: PmsmParameters): TorqueBreakdown {
  const magnetTorqueNm = 1.5 * motor.polePairs * motor.fluxLinkageWb * dq.iqA;
  const reluctanceTorqueNm = 1.5 * motor.polePairs * (motor.ldH - motor.lqH) * dq.idA * dq.iqA;
  return { magnetTorqueNm, reluctanceTorqueNm, totalTorqueNm: magnetTorqueNm + reluctanceTorqueNm };
}

/** Closed-form MTPA operating point for a GIVEN current magnitude (peak) —
 *  i.e. "at this same |Is|, what Id/Iq split maximises torque per amp?"
 *  id* = [lambda_pm - sqrt(lambda_pm^2 + 8*dL^2*Is^2)] / (4*dL), dL = Lq-Ld.
 *  Cross-verified algebraically against the standard Iq-parameterised MTPA
 *  formula (id* = [-lambda_pm + sqrt(lambda_pm^2 + (4*L1*Iq)^2)] / (4*L1),
 *  L1=(Ld-Lq)/2) — both give the same (id, iq) pair for a matching example.
 *  For a surface-PM motor (Ld=Lq, no saliency) MTPA is simply Id=0. */
export function mtpaAtMagnitude(magnitudePeakA: number, motor: PmsmParameters): DqCurrent {
  const dL = motor.lqH - motor.ldH;
  if (Math.abs(dL) < 1e-9 || magnitudePeakA <= 0) {
    return { idA: 0, iqA: magnitudePeakA };
  }
  const psi = motor.fluxLinkageWb;
  const idA = (psi - Math.sqrt(psi * psi + 8 * dL * dL * magnitudePeakA * magnitudePeakA)) / (4 * dL);
  const iqSq = Math.max(magnitudePeakA * magnitudePeakA - idA * idA, 0);
  return { idA, iqA: Math.sqrt(iqSq) };
}

/** Samples the MTPA locus (Id vs Iq) from 0 up to maxMagnitudePeakA, for
 *  plotting the curve the current operating point is compared against. */
export function mtpaLocus(maxMagnitudePeakA: number, motor: PmsmParameters, points = 40): DqCurrent[] {
  const out: DqCurrent[] = [];
  for (let i = 0; i <= points; i++) {
    out.push(mtpaAtMagnitude((maxMagnitudePeakA * i) / points, motor));
  }
  return out;
}

export interface SpeedDependentResult {
  electricalFrequencyHz: number;
  backEmfPeakV: number; // phase, peak
  backEmfRmsV: number; // phase, rms
  mechanicalPowerW: number; // ideal — stator resistance and iron losses not modelled
}

/** Electrical frequency, phase back-EMF, and ideal (lossless) mechanical
 *  power at a given mechanical speed and torque. */
export function speedDependentResults(speedRpm: number, motor: PmsmParameters, totalTorqueNm: number): SpeedDependentResult {
  const electricalFrequencyHz = (speedRpm * motor.polePairs) / 60;
  const omegaElecRadPerS = 2 * Math.PI * electricalFrequencyHz;
  const backEmfPeakV = omegaElecRadPerS * motor.fluxLinkageWb;
  const omegaMechRadPerS = (speedRpm * 2 * Math.PI) / 60;
  return {
    electricalFrequencyHz,
    backEmfPeakV,
    backEmfRmsV: peakToRms(backEmfPeakV),
    mechanicalPowerW: totalTorqueNm * omegaMechRadPerS,
  };
}
