import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/(logged-out)/home/page';

describe('Home Page', () => {
  it('renders the hero section content', () => {
    render(<HomePage />);

    // Main heading
    expect(screen.getByText('Kosuke Template')).toBeInTheDocument();

    // Subtitle
    expect(
      screen.getByText(
        'The modern, production-ready Next.js template with everything you need to build amazing web applications.'
      )
    ).toBeInTheDocument();

    // CTA buttons (there are multiple instances, so we check for at least one)
    expect(screen.getAllByText('Star on GitHub')).toHaveLength(2);
    expect(screen.getByText('View Repository')).toBeInTheDocument();

    // Git clone command
    expect(
      screen.getByText('git clone https://github.com/filopedraz/kosuke-template.git')
    ).toBeInTheDocument();
  });
});
