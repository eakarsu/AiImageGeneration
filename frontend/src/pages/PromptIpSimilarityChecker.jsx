import React, { useEffect, useState } from 'react';

export default function PromptIpSimilarityChecker() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/prompt-ip-similarity-checker').then((r) => r.json()).then(setData).catch(() => {});
  }, []);
  return (
    <div>
      <h1>Prompt IP Similarity Checker</h1>
      <p>Flags prompts that may overlap protected characters, brands, or recognizable visual trade dress.</p>
      {data?.matches?.map((m) => <section key={m.title} className="card"><h2>{m.title}</h2><p>{m.action} - risk {m.risk_score}</p></section>)}
    </div>
  );
}
