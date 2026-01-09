/**
 * Demo Call Reporting Data
 */

import type { CallReport, CallReportStats } from '$lib/domain';

// Generate some realistic demo call reports
function generateDemoCallReports(): CallReport[] {
  const users = [
    { id: 'usr-001', name: 'John Smith' },
    { id: 'usr-002', name: 'Jane Doe' },
    { id: 'usr-003', name: 'Bob Wilson' },
    { id: 'usr-004', name: 'Alice Brown' },
    { id: 'usr-005', name: 'Charlie Davis' },
  ];

  const groups = [
    { id: 'grp-001', name: 'Sales' },
    { id: 'grp-002', name: 'Support' },
    { id: 'grp-003', name: 'General' },
  ];

  const directions: ('inbound' | 'outbound' | 'internal')[] = ['inbound', 'outbound', 'internal'];
  const results: ('answered' | 'missed' | 'voicemail' | 'abandoned')[] = ['answered', 'answered', 'answered', 'missed', 'voicemail', 'abandoned'];

  const reports: CallReport[] = [];

  for (let i = 0; i < 100; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const group = Math.random() > 0.3 ? groups[Math.floor(Math.random() * groups.length)] : null;
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const result = results[Math.floor(Math.random() * results.length)];
    const timeTalking = result === 'answered' ? Math.floor(Math.random() * 600) : 0;
    const timeRinging = Math.floor(Math.random() * 30);
    const timeInQueue = Math.random() > 0.5 ? Math.floor(Math.random() * 120) : 0;

    reports.push({
      id: `call-${String(i + 1).padStart(3, '0')}`,
      direction,
      result,
      dateTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      number: `+44 ${Math.floor(Math.random() * 900000000 + 100000000)}`,
      timeTalking,
      timeRinging,
      timeInQueue,
      totalDuration: timeTalking + timeRinging + timeInQueue,
      userId: user.id,
      userName: user.name,
      groupId: group?.id,
      groupName: group?.name,
      hasRecording: result === 'answered' && Math.random() > 0.3,
      callerId: direction === 'inbound' ? `+44 ${Math.floor(Math.random() * 900000000 + 100000000)}` : undefined,
    });
  }

  // Sort by date descending
  return reports.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
}

export const DEMO_CALL_REPORTS: CallReport[] = generateDemoCallReports();

export const DEMO_CALL_REPORT_STATS: CallReportStats = {
  totalCalls: DEMO_CALL_REPORTS.length,
  answeredCalls: DEMO_CALL_REPORTS.filter(r => r.result === 'answered').length,
  missedCalls: DEMO_CALL_REPORTS.filter(r => r.result === 'missed').length,
  avgTalkTime: Math.round(DEMO_CALL_REPORTS.filter(r => r.timeTalking > 0).reduce((sum, r) => sum + r.timeTalking, 0) / DEMO_CALL_REPORTS.filter(r => r.timeTalking > 0).length) || 0,
  avgWaitTime: Math.round(DEMO_CALL_REPORTS.filter(r => r.timeInQueue > 0).reduce((sum, r) => sum + r.timeInQueue, 0) / DEMO_CALL_REPORTS.filter(r => r.timeInQueue > 0).length) || 0,
  answerRate: Math.round((DEMO_CALL_REPORTS.filter(r => r.result === 'answered').length / DEMO_CALL_REPORTS.length) * 100),
  byDirection: {
    inbound: DEMO_CALL_REPORTS.filter(r => r.direction === 'inbound').length,
    outbound: DEMO_CALL_REPORTS.filter(r => r.direction === 'outbound').length,
    internal: DEMO_CALL_REPORTS.filter(r => r.direction === 'internal').length,
  },
  byResult: {
    answered: DEMO_CALL_REPORTS.filter(r => r.result === 'answered').length,
    missed: DEMO_CALL_REPORTS.filter(r => r.result === 'missed').length,
    voicemail: DEMO_CALL_REPORTS.filter(r => r.result === 'voicemail').length,
    busy: 0,
    failed: 0,
    abandoned: DEMO_CALL_REPORTS.filter(r => r.result === 'abandoned').length,
    transferred: 0,
    other: 0,
  },
};
