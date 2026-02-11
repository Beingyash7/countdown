/**
 * Offline "mission" generator.
 *
 * Why:
 * - This is a front-end-only app meant to be shared with classmates.
 * - Shipping an API key in the browser is not safe (anyone can extract it).
 * - So we replace Gemini calls with deterministic, local generation.
 */

export interface MissionData {
  name: string;
  status: string;
  progress: number;
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const missionPrefixes = [
  'Astra', 'Nebula', 'Orion', 'Vanguard', 'Helios', 'Nova', 'Spectre', 'Titan',
  'Atlas', 'Pulse', 'Krypton', 'Zenith', 'Aurora', 'Eclipse', 'Vector', 'Cipher'
];

const missionCores = [
  'Countdown', 'Launch', 'Run', 'Protocol', 'Drive', 'Sync', 'Upgrade', 'Revision',
  'Sprint', 'Deployment', 'Calibration', 'Checkpoint', 'Ignition', 'Push', 'Sequence'
];

const missionSuffixes = [
  'Alpha', 'Prime', 'X', 'Phase-2', 'Mk-II', 'Ops', 'Core', 'Grid', 'Node', 'Stack'
];

const statusLines = [
  'All systems nominal · Holding steady.',
  'Telemetry stable · Focus maintained.',
  'Final checks in progress · No anomalies.',
  'Locking targets · Precision mode enabled.',
  'Sync complete · Proceeding to next cycle.',
  'Pressure test passing · Keep momentum.',
  'Signal strong · Execution window open.',
  'Navigation aligned · Stay on course.',
  'Stability confirmed · Continue burn.',
  'Calibration complete · Ready for ignition.'
];

export const generateMissionUpdate = async (missionName: string): Promise<string> => {
  // Tiny bit of flavor tied to the mission name
  const seed = missionName.length % 4;
  const variants = [
    'All systems nominal',
    'Telemetry stable',
    'Locking targets',
    'Calibration complete'
  ];
  const base = variants[seed] || 'All systems nominal';
  const tail = pick([
    '· Focus maintained.',
    '· Hold steady.',
    '· Next cycle ready.',
    '· Proceed on green.'
  ]);
  return `${base} ${tail}`.trim();
};

export const generateNewMission = async (): Promise<MissionData> => {
  const name = `${pick(missionPrefixes)} ${pick(missionCores)} ${pick(missionSuffixes)}`;
  const status = pick(statusLines);
  const progress = Math.max(5, Math.min(95, Math.floor(Math.random() * 96)));
  return { name, status, progress };
};
