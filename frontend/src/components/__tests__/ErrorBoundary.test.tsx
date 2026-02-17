/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function ThrowError() {
    throw new Error('Test error');
    return null;
}

function GoodComponent() {
    return <div>Hello World</div>;
}

describe('ErrorBoundary', () => {
    it('renders children when no error', () => {
        render(
            <ErrorBoundary>
                <GoodComponent />
            </ErrorBoundary>,
        );
        expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders fallback UI when error occurs', () => {
        // Suppress console.error for this test
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(
            <ErrorBoundary>
                <ThrowError />
            </ErrorBoundary>,
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();

        spy.mockRestore();
    });
});
