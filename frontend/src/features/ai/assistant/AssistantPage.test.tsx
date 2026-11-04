import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/render';
import { ASSISTANT_GREETING } from '../fake-data';
import { AssistantPage } from './AssistantPage';

describe('AssistantPage', () => {
  it('starts with a greeting and suggestions', () => {
    renderWithProviders(<AssistantPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Assistant' })).toBeInTheDocument();
    expect(screen.getByText(ASSISTANT_GREETING)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Which service is the noisiest today?' }),
    ).toBeInTheDocument();
  });

  it('answers a typed message on Enter and clears the input', async () => {
    const { user } = renderWithProviders(<AssistantPage />);
    const input = screen.getByRole('textbox', { name: 'Message' });

    await user.type(input, 'hej{Enter}');

    expect(screen.getByText('hej')).toBeInTheDocument();
    expect(screen.getByText(/Searching logs for "hej"/)).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('answers when Send is clicked', async () => {
    const { user } = renderWithProviders(<AssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'hello');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(screen.getByText(/Searching logs for "hello"/)).toBeInTheDocument();
  });

  it('gives the canned answer for a suggestion', async () => {
    const { user } = renderWithProviders(<AssistantPage />);

    await user.click(screen.getByRole('button', { name: 'Which service is the noisiest today?' }));

    expect(screen.getByText(/18\.4k log lines\/hour/)).toBeInTheDocument();
  });

  it('ignores an empty message', async () => {
    const { user } = renderWithProviders(<AssistantPage />);

    await user.type(screen.getByRole('textbox', { name: 'Message' }), '   {Enter}');

    expect(screen.queryByText(/Searching logs/)).not.toBeInTheDocument();
  });
});
