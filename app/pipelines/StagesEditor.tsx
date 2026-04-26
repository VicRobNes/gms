'use client';

import { useMemo, useState } from 'react';
import type { PipelineStage, StageKind } from '../../lib/store';

interface StagesEditorProps {
  initialStages: PipelineStage[];
}

const KINDS: StageKind[] = ['open', 'won', 'lost'];

export function StagesEditor({ initialStages }: StagesEditorProps) {
  const [stages, setStages] = useState<PipelineStage[]>(initialStages);

  const json = useMemo(() => JSON.stringify(stages), [stages]);

  const update = (i: number, patch: Partial<PipelineStage>) =>
    setStages((curr) => curr.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const remove = (i: number) =>
    setStages((curr) => curr.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setStages((curr) => {
      const j = i + dir;
      if (j < 0 || j >= curr.length) return curr;
      const next = curr.slice();
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const add = () => setStages((curr) => [...curr, { name: '', kind: 'open' }]);

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 8 }}>Stages</div>
      <input type="hidden" name="stages" value={json} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stages.map((s, i) => (
          <div key={i} className="row" style={{ gap: 6 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Stage name"
              required
            />
            <select
              value={s.kind}
              onChange={(e) => update(i, { kind: e.target.value as StageKind })}
              style={{ width: 100 }}
            >
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <button type="button" className="btn btn-ghost" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
            <button type="button" className="btn btn-ghost" onClick={() => move(i, 1)} disabled={i === stages.length - 1} title="Move down">↓</button>
            <button type="button" className="btn btn-ghost btn-danger" onClick={() => remove(i)} title="Remove" disabled={stages.length <= 1}>✕</button>
          </div>
        ))}
        <button type="button" className="btn" onClick={add} style={{ alignSelf: 'flex-start' }}>+ Add stage</button>
      </div>
    </div>
  );
}
