import React from 'react';
import { Link } from 'react-router-dom';

const MODELS = [
  {
    name: 'GPT-4o',
    provider: 'Azure OpenAI',
    description: "OpenAI's flagship multimodal model. Excellent for complex reasoning, code generation, and nuanced text tasks.",
    badge: 'OpenAI',
    badgeColor: '#0078d4',
    contextWindow: '128K tokens',
    icon: '🧠',
  },
  {
    name: 'Mistral-Large-3',
    provider: 'Azure AI Foundry',
    description: 'High-performance model from Mistral AI. Strong multilingual capabilities and efficient inference.',
    badge: 'Mistral AI',
    badgeColor: '#107c10',
    contextWindow: '32K tokens',
    icon: '⚡',
  },
  {
    name: 'Meta Llama 3 70B',
    provider: 'Azure AI Foundry',
    description: "Meta's open-weight model at 70 billion parameters. Ideal for customization and open-source workflows.",
    badge: 'Meta',
    badgeColor: '#8764b8',
    contextWindow: '8K tokens',
    icon: '🦙',
  },
];

const STEPS = [
  { step: '01', title: 'Register', description: 'Submit your name, email, and a brief description of what you are building.' },
  { step: '02', title: 'Get approved', description: 'Access requests are reviewed. You will receive an email once your request is processed.' },
  { step: '03', title: 'Receive your key', description: 'Your API key arrives by email. Drop it into your existing code — no SDK required.' },
  { step: '04', title: 'Build', description: 'Call any provisioned model from your application. Monitor usage from your dashboard.' },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #003066 0%, #0078d4 60%, #0091ff 100%)',
        color: 'white',
        padding: '80px 0 96px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -150, left: -150, width: 400, height: 400, background: 'rgba(255,255,255,0.03)', borderRadius: '50%' }} />

        <div className="container" style={{ position: 'relative' }}>
          <div style={{ maxWidth: 680 }}>
            <h1 style={{ fontSize: '3rem', marginBottom: 24, lineHeight: 1.15, fontWeight: 800 }}>
              API access to frontier LLMs.
              <br />No setup. No billing.
            </h1>

            <p style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: 40, lineHeight: 1.65, maxWidth: 560 }}>
              Mikehub provisions API keys to approved developers.
              One key gives you access to the models enabled on your account —
              served through a unified, OpenAI-compatible endpoint.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--color-primary-600)', fontWeight: 700 }}>
                Request access →
              </Link>
              <Link to="/docs" className="btn btn-lg" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.3)' }}>
                View docs
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 32, marginTop: 48, opacity: 0.8, flexWrap: 'wrap' }}>
              {[
                { label: 'Models available', value: '3+' },
                { label: 'Unified endpoint', value: '1' },
                { label: 'Built on', value: 'Azure' },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{stat.value}</div>
                  <div style={{ fontSize: '0.875rem' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Models */}
      <section style={{ padding: '80px 0', background: 'white' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2>Available models</h2>
            <p style={{ color: 'var(--color-gray-500)', marginTop: 12, fontSize: '1.0625rem' }}>
              All models share a single endpoint pattern and the same subscription key.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {MODELS.map(model => (
              <div key={model.name} className="card" style={{ position: 'relative', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>

                <div style={{ position: 'absolute', top: 20, right: 20, background: model.badgeColor, color: 'white', padding: '3px 10px', borderRadius: 100, fontSize: '0.75rem', fontWeight: 700 }}>
                  {model.badge}
                </div>

                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{model.icon}</div>
                <h3 style={{ marginBottom: 4 }}>{model.name}</h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {model.provider}
                </div>

                <p style={{ color: 'var(--color-gray-600)', marginBottom: 16, fontSize: '0.9375rem', lineHeight: 1.6 }}>
                  {model.description}
                </p>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-gray-500)' }}>Context window:</span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-gray-700)', background: 'var(--color-gray-100)', padding: '2px 8px', borderRadius: 4 }}>
                    {model.contextWindow}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 0', background: 'var(--color-gray-50)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2>How it works</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {STEPS.map(step => (
              <div key={step.step} style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, background: 'var(--color-primary-50)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary-500)' }}>
                  {step.step}
                </div>
                <h4 style={{ marginBottom: 8 }}>{step.title}</h4>
                <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '72px 0', background: 'linear-gradient(135deg, var(--color-primary-700), var(--color-primary-500))', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ marginBottom: 16, color: 'white' }}>Ready to start building?</h2>
          <p style={{ fontSize: '1.0625rem', opacity: 0.9, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
            Submit a request and get your API key within one business day.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--color-primary-600)', fontWeight: 700 }}>
              Request access →
            </Link>
            <Link to="/docs" className="btn btn-lg" style={{ background: 'transparent', color: 'white', border: '2px solid rgba(255,255,255,0.5)' }}>
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--color-gray-900)', color: 'var(--color-gray-400)', padding: '28px 0', textAlign: 'center', fontSize: '0.875rem' }}>
        <div className="container">
          <p>
            Mikehub · Powered by{' '}
            <strong style={{ color: 'var(--color-gray-300)' }}>Azure API Management</strong>
            {' · '}
            <strong style={{ color: 'var(--color-gray-300)' }}>Azure AI Foundry</strong>
          </p>
          <p style={{ marginTop: 8 }}>
            <Link to="/docs" style={{ color: 'var(--color-gray-400)' }}>Docs</Link>
            {' · '}
            <Link to="/register" style={{ color: 'var(--color-gray-400)' }}>Register</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
