import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('Admin Panel Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '40px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            padding: '48px',
            maxWidth: '700px',
            width: '100%',
            border: '1px solid #fee2e2',
            boxShadow: '0 20px 60px rgba(0,0,0,0.08)'
          }}>
            <div style={{
              width: '56px', height: '56px',
              background: '#fef2f2', borderRadius: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '20px', fontSize: '28px'
            }}>⚠️</div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
              The admin panel encountered an error. See details below.
            </p>
            <div style={{
              background: '#fef2f2', borderRadius: '12px', padding: '16px',
              border: '1px solid #fecaca', marginBottom: '24px'
            }}>
              <p style={{ fontSize: '12px', fontWeight: '700', color: '#3b82f6', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {this.state.error?.toString()}
              </p>
            </div>
            {this.state.errorInfo && (
              <details style={{ marginBottom: '24px' }}>
                <summary style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', cursor: 'pointer', marginBottom: '8px' }}>
                  STACK TRACE
                </summary>
                <pre style={{
                  fontSize: '10px', color: '#64748b', background: '#f8fafc',
                  padding: '12px', borderRadius: '8px', overflow: 'auto',
                  maxHeight: '200px', fontFamily: 'monospace'
                }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#bc36ad', color: 'white', border: 'none',
                padding: '12px 28px', borderRadius: '12px', fontWeight: '800',
                fontSize: '12px', cursor: 'pointer', letterSpacing: '0.05em'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
