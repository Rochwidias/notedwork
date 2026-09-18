import { render, screen } from '@testing-library/react';
import NotesView from '@/components/NotesView';

// Mock the Note type
jest.mock('@/components/NotesView', () => ({
  __esModule: true,
  default: jest.fn(() => null),
  Note: {
    id: 'string',
    title: 'string',
    body: 'string',
    pinned: 'boolean'
  }
}));

describe('NotesView', () => {
  it('renders empty state message', () => {
    render(<NotesView />);
    expect(screen.getByText('No notes yet. Click the + button to add one.')).toBeInTheDocument();
  });
});