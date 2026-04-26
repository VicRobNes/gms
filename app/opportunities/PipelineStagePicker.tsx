'use client';

import { useState } from 'react';
import type { Pipeline } from '../../lib/store';

interface PipelineStagePickerProps {
  pipelines: Pipeline[];
  defaultPipelineId: string;
}

/**
 * Tiny pair of selects: pipeline + stage. Selecting a pipeline rebuilds the
 * stage options to that pipeline's stages, so the submitted (pipelineId, stage)
 * is always consistent.
 */
export function PipelineStagePicker({ pipelines, defaultPipelineId }: PipelineStagePickerProps) {
  const [pipelineId, setPipelineId] = useState(defaultPipelineId);
  const pipeline = pipelines.find((p) => p.id === pipelineId) ?? pipelines[0]!;

  return (
    <>
      <div className="field">
        <label htmlFor="o-pipeline">Pipeline</label>
        <select id="o-pipeline" name="pipelineId" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="o-stage">Stage</label>
        <select id="o-stage" name="stage" defaultValue={pipeline.stages[0]?.name} key={pipeline.id}>
          {pipeline.stages.map((s) => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}
