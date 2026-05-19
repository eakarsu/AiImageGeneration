import PromptSuccessRateChart from '../components/PromptSuccessRateChart';
import StyleConsistencyHeatmap from '../components/StyleConsistencyHeatmap';
import ImageGenReportPDF from '../components/ImageGenReportPDF';
import PromptTemplateEditor from '../components/PromptTemplateEditor';

function CustomViewsPage() {
  return (
    <div style={{ padding: 20, color: '#e5e7eb' }}>
      <h1 style={{ marginBottom: 4 }}>Image Views</h1>
      <p style={{ color: '#9ca3af', marginTop: 0, marginBottom: 16 }}>
        Custom analytics and tooling for the AI image generation platform.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
        <div data-testid="viz-prompt-success-rate">
          <PromptSuccessRateChart />
        </div>
        <div data-testid="viz-style-consistency">
          <StyleConsistencyHeatmap />
        </div>
        <div data-testid="nonviz-image-gen-report">
          <ImageGenReportPDF />
        </div>
        <div data-testid="nonviz-prompt-template-editor">
          <PromptTemplateEditor />
        </div>
      </div>
    </div>
  );
}

export default CustomViewsPage;
