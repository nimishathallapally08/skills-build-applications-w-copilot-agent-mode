import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Item = Record<string, unknown>;
type Kind = 'activities' | 'teams' | 'leaderboard' | 'workouts';
type State = { status: 'loading' } | { status: 'error' } | { status: 'success'; items: Item[] };
type Props = {
  title: string;
  description: string;
  endpoint: string;
  collection: string;
  emptyMessage: string;
  kind: Kind;
};

function displayItem(kind: Kind, item: Item) {
  if (kind === 'activities') return `${item.type}: ${item.minutes} minutes, ${item.points} points`;
  if (kind === 'teams') return `${item.name} (${Array.isArray(item.members) ? item.members.length : 0} members)`;
  if (kind === 'leaderboard') return `#${item.rank} ${item.teamName}: ${item.totalPoints} points`;
  return `${item.title}: ${item.reason}`;
}

export function CapabilityCard({ title, description, endpoint, collection, emptyMessage, kind }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getJson<Record<string, unknown>>(endpoint)
      .then((response) => {
        const items = response[collection];
        if (!Array.isArray(items)) throw new Error('Invalid API response');
        if (!cancelled) setState({ status: 'success', items: items as Item[] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [collection, endpoint]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {state.status === 'loading' && <p role="status">Loading {title.toLowerCase()}...</p>}
    {state.status === 'error' && <p role="alert">Unable to load {title.toLowerCase()}.</p>}
    {state.status === 'success' && state.items.length === 0 && <p role="status">{emptyMessage}</p>}
    {state.status === 'success' && state.items.length > 0 && <ul className="list-group list-group-flush">
      {state.items.map((item, index) => <li className="list-group-item" key={String(item._id ?? index)}>{displayItem(kind, item)}</li>)}
    </ul>}
  </div></section>;
}
