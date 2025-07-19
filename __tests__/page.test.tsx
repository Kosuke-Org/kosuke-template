import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/(logged-out)/home/page';

describe('Home Page', () => {
  it('renders the hero section content', () => {
    render(<HomePage />);

    // Main heading parts (text is split across spans)
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Extraordinary')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();

    // Subtitle
    expect(
      screen.getByText(
        'The most complete Next.js template with authentication, billing, database, and everything you need to ship fast.'
      )
    ).toBeInTheDocument();

    // Badge
    expect(screen.getByText('Production-ready Next.js template')).toBeInTheDocument();

    // CTA buttons
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('View on GitHub')).toBeInTheDocument();
    expect(screen.getByText('Star on GitHub')).toBeInTheDocument();
    expect(screen.getByText('Setup Guide')).toBeInTheDocument();
  });

  it('renders the features section', () => {
    render(<HomePage />);

    // Features section heading
    expect(screen.getByText('Everything You Need,')).toBeInTheDocument();
    expect(screen.getByText(/Nothing You Don.t/)).toBeInTheDocument();

    // Feature cards
    expect(screen.getByText('Next.js 15 Ready')).toBeInTheDocument();
    expect(screen.getByText('Auth & Security')).toBeInTheDocument();
    expect(screen.getByText('Design System')).toBeInTheDocument();
    expect(screen.getByText('Subscription Ready')).toBeInTheDocument();
  });

  it('renders the tech stack section', () => {
    render(<HomePage />);

    expect(screen.getByText('Powered by Industry Leaders')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Built with the most trusted technologies. Click any logo to explore their docs.'
      )
    ).toBeInTheDocument();
  });

  it('renders the final CTA section', () => {
    render(<HomePage />);

    expect(screen.getByText('Ready to')).toBeInTheDocument();
    expect(screen.getByText('Ship Fast?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Join thousands of developers building the next generation of web applications.'
      )
    ).toBeInTheDocument();
  });
});
