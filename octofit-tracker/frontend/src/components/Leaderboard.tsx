import { CapabilityCard } from './CapabilityCard.js';
export default function Leaderboard() {
  return <CapabilityCard title="Leaderboard" description="Compare team point totals." endpoint="/api/leaderboard" collection="leaderboard" emptyMessage="No leaderboard rankings yet." kind="leaderboard" />;
}
