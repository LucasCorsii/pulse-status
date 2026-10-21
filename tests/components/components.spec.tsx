import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LatencyChart } from '../../apps/web/components/LatencyChart';
import { StatusBadge } from '../../apps/web/components/StatusBadge';

describe('primary status components', () => {
  it('renders the status label and matching visual state', () => {
    const html = renderToStaticMarkup(<StatusBadge status="UP" />);
    expect(html).toContain('UP');
    expect(html).toContain('bg-emerald-500');
  });

  it('renders a labeled latency chart from check history', () => {
    const html = renderToStaticMarkup(
      <LatencyChart
        checks={[
          { id: '1', result: 'SUCCESS', statusCode: 200, latencyMs: 125, checkedAt: '2026-01-01' },
          {
            id: '2',
            result: 'FAILURE',
            statusCode: null,
            latencyMs: null,
            checkedAt: '2026-01-02',
          },
        ]}
      />,
    );
    expect(html).toContain('Latência (últimas 2 checagens)');
    expect(html).toContain('aria-label="Gráfico de latência"');
    expect(html).toContain('<path');
  });
});
