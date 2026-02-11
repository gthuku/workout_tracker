import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Simple component for testing (we'll test the Layout component behavior)
function TestWrapper({ children }: { children: React.ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
}

describe('Frontend Test Setup', () => {
    it('should have testing library available', () => {
        expect(render).toBeDefined();
        expect(screen).toBeDefined();
        expect(userEvent).toBeDefined();
    });

    it('should render a basic element', () => {
        render(
            <TestWrapper>
                <div data-testid="test-element">Hello World</div>
            </TestWrapper>
        );

        expect(screen.getByTestId('test-element')).toBeInTheDocument();
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should handle user events', async () => {
        const handleClick = vi.fn();

        render(
            <TestWrapper>
                <button onClick={handleClick}>Click Me</button>
            </TestWrapper>
        );

        const button = screen.getByRole('button', { name: /click me/i });
        await userEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle text input', async () => {
        render(
            <TestWrapper>
                <input type="text" placeholder="Enter text" />
            </TestWrapper>
        );

        const input = screen.getByPlaceholderText('Enter text');
        await userEvent.type(input, 'Hello');

        expect(input).toHaveValue('Hello');
    });
});

describe('jest-dom matchers', () => {
    it('should have toBeInTheDocument matcher', () => {
        render(<div data-testid="test">Test</div>);
        expect(screen.getByTestId('test')).toBeInTheDocument();
    });

    it('should have toBeVisible matcher', () => {
        render(<div data-testid="visible">Visible</div>);
        expect(screen.getByTestId('visible')).toBeVisible();
    });

    it('should have toHaveClass matcher', () => {
        render(<div data-testid="styled" className="my-class">Styled</div>);
        expect(screen.getByTestId('styled')).toHaveClass('my-class');
    });

    it('should have toBeDisabled matcher', () => {
        render(<button disabled>Disabled</button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should have toHaveAttribute matcher', () => {
        render(<a href="https://example.com">Link</a>);
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');
    });
});
