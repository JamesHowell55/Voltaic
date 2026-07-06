// Motor torque/power/speed triangle: P = T * omega. A single well-established
// relationship — solved for whichever one of the three quantities isn't the
// given pair. Canonical units here match unitConversions.ts's own base units
// for each category (torque: N·m, power: W, angular velocity: rad/s), so the
// page can convert to/from the user's chosen display unit via the existing
// `convert()` helper instead of duplicating conversion factors.

export type SolveFor = 'torque' | 'power' | 'speed';

export interface TorquePowerSpeedInput {
  solveFor: SolveFor;
  torqueNm: number;
  powerW: number;
  speedRadS: number;
}

export interface TorquePowerSpeedResult {
  torqueNm: number;
  powerW: number;
  speedRadS: number;
}

export function solveTorquePowerSpeed(input: TorquePowerSpeedInput): TorquePowerSpeedResult {
  const { solveFor, torqueNm, powerW, speedRadS } = input;

  if (solveFor === 'torque') {
    const t = speedRadS !== 0 ? powerW / speedRadS : 0;
    return { torqueNm: t, powerW, speedRadS };
  }
  if (solveFor === 'power') {
    return { torqueNm, powerW: torqueNm * speedRadS, speedRadS };
  }
  // solveFor === 'speed'
  const omega = torqueNm !== 0 ? powerW / torqueNm : 0;
  return { torqueNm, powerW, speedRadS: omega };
}

// PM-motor cross-check: torque directly from phase current and the motor's
// torque constant, independent of the P=T*omega triangle above.
export function torqueFromCurrent(currentA: number, torqueConstantNmPerA: number): number {
  return currentA * torqueConstantNmPerA;
}

// Electrical input power implied by a mechanical output power and an
// efficiency figure (motoring convention: input = output / efficiency).
export function electricalInputPower(mechanicalPowerW: number, efficiencyPercent: number): number | null {
  if (efficiencyPercent <= 0) return null;
  return mechanicalPowerW / (efficiencyPercent / 100);
}
