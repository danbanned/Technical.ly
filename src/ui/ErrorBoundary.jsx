import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { caught: false };
  }

  static getDerivedStateFromError() {
    return { caught: true };
  }

  componentDidCatch(err, info) {
    console.error('[ErrorBoundary]', err, info?.componentStack ?? '');
  }

  render() {
    if (this.state.caught) {
      return (
        <div className="phila-panel" style={{ padding: '12px 14px', color: '#ef5350', fontSize: 12 }}>
          {this.props.fallback ?? 'This panel hit an error.'}
        </div>
      );
    }
    return this.props.children;
  }
}
