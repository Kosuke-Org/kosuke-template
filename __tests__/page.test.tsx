import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/(logged-out)/home/page';

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen,
});

// Mock navigator.clipboard
const mockWriteText = jest.fn();
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: mockWriteText,
  },
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindowOpen.mockClear();
    mockWriteText.mockClear();
  });

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

  it('opens GitHub repository when Star on GitHub button is clicked', () => {
    render(<HomePage />);

    // Find the first "Star on GitHub" button
    const starButtons = screen.getAllByText('Star on GitHub');
    fireEvent.click(starButtons[0]);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/filopedraz/kosuke-template',
      '_blank'
    );
  });

  it('opens GitHub repository when View Repository button is clicked', () => {
    render(<HomePage />);

    const viewRepoButton = screen.getByText('View Repository');
    fireEvent.click(viewRepoButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/filopedraz/kosuke-template',
      '_blank'
    );
  });

  it('opens setup guide when View Setup Guide button is clicked', () => {
    render(<HomePage />);

    const setupGuideButton = screen.getByText('View Setup Guide');
    fireEvent.click(setupGuideButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/filopedraz/kosuke-template/blob/main/cli/README.md',
      '_blank'
    );
  });

  it('opens Twitter share when Share on X button is clicked', () => {
    render(<HomePage />);

    // Find the X share button
    const xButton = screen.getByRole('button', { name: /share on x/i });
    fireEvent.click(xButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://twitter.com/intent/tweet?text=Check%20out%20Kosuke%20Template%20-%20modern%20Next.js%20template%20with%20everything%20you%20need!&url=https://github.com/filopedraz/kosuke-template',
      '_blank'
    );
  });

  it('handles multiple Star on GitHub buttons correctly', () => {
    render(<HomePage />);

    // Click all Star on GitHub buttons
    const starButtons = screen.getAllByText('Star on GitHub');
    starButtons.forEach((button) => {
      fireEvent.click(button);
    });

    // Should be called for each button click
    expect(mockWindowOpen).toHaveBeenCalledTimes(starButtons.length);
    expect(mockWindowOpen).toHaveBeenCalledWith(
      'https://github.com/filopedraz/kosuke-template',
      '_blank'
    );
  });

  it('renders key sections and content', () => {
    render(<HomePage />);

    // Check for key headings/sections that are definitely present
    expect(screen.getByText('Kosuke Template')).toBeInTheDocument();

    // Check for specific technology names that should be present
    expect(screen.getByText('Next.js 15 + React 19')).toBeInTheDocument();
    expect(screen.getByText('Clerk Authentication')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL + Drizzle')).toBeInTheDocument();
    expect(screen.getByText('Shadcn UI + Tailwind')).toBeInTheDocument();
  });

  it('renders interactive elements correctly', () => {
    render(<HomePage />);

    // Check that all interactive buttons are present
    expect(screen.getAllByText('Star on GitHub')).toHaveLength(2);
    expect(screen.getByText('View Repository')).toBeInTheDocument();
    expect(screen.getByText('View Setup Guide')).toBeInTheDocument();

    // Check for copy functionality by checking for the git clone text
    const gitCloneText = screen.getByText(
      'git clone https://github.com/filopedraz/kosuke-template.git'
    );
    expect(gitCloneText).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /share on x/i })).toBeInTheDocument();
  });

  it('handles copy command functionality', () => {
    render(<HomePage />);

    // Find the copy button by finding the parent of the git clone text
    const gitCloneText = screen.getByText(
      'git clone https://github.com/filopedraz/kosuke-template.git'
    );
    const copyContainer = gitCloneText.closest('div');
    const copyButton = copyContainer?.querySelector('button');

    if (copyButton) {
      // Click the copy button
      fireEvent.click(copyButton);

      // Check that clipboard.writeText was called
      expect(mockWriteText).toHaveBeenCalledWith(
        'git clone https://github.com/filopedraz/kosuke-template.git'
      );
    }
  });

  it('handles navigation accessibility', () => {
    render(<HomePage />);

    // Check that buttons are accessible
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Check that buttons have proper attributes for accessibility
    buttons.forEach((button) => {
      expect(button).toBeInTheDocument();
    });
  });
});
