import React from 'react';
import AIReport from './AIReport';

export default function StructuredAIResult({ record, title, saved = false }) {
  const response = record?.ai_response ?? record?.response ?? record;
  if (response === null || response === undefined) return null;
  return (
    <section className="structured-ai-result" aria-label={saved ? 'Saved structured AI result' : 'Returned structured AI result'}>
      <AIReport response={response} title={title} />
    </section>
  );
}
