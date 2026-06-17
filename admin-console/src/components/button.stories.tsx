import { Button, type ButtonProps } from './button';

/**
 * Storybook-style Component Story Format catalog for <Button>. Self-typed so it
 * compiles without the Storybook runtime; wire `@storybook/react` to view it live.
 */
type Story = { name: string; args: ButtonProps };

const meta = {
  title: 'Components/Button',
  component: Button,
};
export default meta;

export const Solid: Story = { name: 'Solid', args: { children: 'Save' } };
export const Outline: Story = { name: 'Outline', args: { variant: 'outline', children: 'Cancel' } };
export const Danger: Story = { name: 'Danger', args: { variant: 'danger', children: 'Delete' } };
export const Loading: Story = { name: 'Loading', args: { isLoading: true, children: 'Saving' } };
