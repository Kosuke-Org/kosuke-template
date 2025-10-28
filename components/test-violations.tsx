'use client';

import React from 'react';

// ❌ Violates: Never use 'any' type
interface BadProps {
  data: any;
  onClick: any;
}

// ❌ Violates: Use functional components, not classes
export class TestComponent extends React.Component<BadProps> {
  render() {
    return (
      <div style={{ backgroundColor: '#FF5733', padding: '20px' }}>
        <h1 style={{ color: '#3366FF' }}>Test Component</h1>
        <p>{this.props.data.something}</p>
        <button onClick={this.props.onClick} style={{ backgroundColor: '#00CC00' }}>
          Click me
        </button>
      </div>
    );
  }
}
