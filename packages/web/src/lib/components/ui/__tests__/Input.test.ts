/**
 * Tests for Input Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Input from '../Input.svelte';

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(Input);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with text type by default', () => {
      render(Input);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should have input class', () => {
      render(Input);
      expect(screen.getByRole('textbox')).toHaveClass('input');
    });
  });

  describe('Types', () => {
    it('should render text type', () => {
      render(Input, { props: { type: 'text' } });
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should render email type', () => {
      render(Input, { props: { type: 'email' } });
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('should render password type', () => {
      const { container } = render(Input, { props: { type: 'password' } });
      const input = container.querySelector('input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render search type', () => {
      render(Input, { props: { type: 'search' } });
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });
  });

  describe('Placeholder', () => {
    it('should render without placeholder by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '');
    });

    it('should render with placeholder', () => {
      render(Input, { props: { placeholder: 'Enter your name' } });
      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });
  });

  describe('Value', () => {
    it('should render with empty value by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).toHaveValue('');
    });

    it('should render with initial value', () => {
      render(Input, { props: { value: 'Initial value' } });
      expect(screen.getByRole('textbox')).toHaveValue('Initial value');
    });

    it('should update value on input', async () => {
      render(Input);
      const input = screen.getByRole('textbox');
      
      await fireEvent.input(input, { target: { value: 'New value' } });
      expect(input).toHaveValue('New value');
    });
  });

  describe('Name and ID', () => {
    it('should render without name by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).toHaveAttribute('name', '');
    });

    it('should render with name', () => {
      render(Input, { props: { name: 'username' } });
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username');
    });

    it('should render without id by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).toHaveAttribute('id', '');
    });

    it('should render with id', () => {
      render(Input, { props: { id: 'email-input' } });
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'email-input');
    });
  });

  describe('Required', () => {
    it('should not be required by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).not.toBeRequired();
    });

    it('should be required when required prop is true', () => {
      render(Input, { props: { required: true } });
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('Disabled', () => {
    it('should not be disabled by default', () => {
      render(Input);
      expect(screen.getByRole('textbox')).not.toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(Input, { props: { disabled: true } });
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should have disabled attribute when disabled', () => {
      render(Input, { props: { disabled: true, value: 'Original' } });
      const input = screen.getByRole('textbox');
      
      // Browser prevents input on disabled elements
      expect(input).toHaveAttribute('disabled');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class', () => {
      render(Input, { props: { class: 'custom-input' } });
      expect(screen.getByRole('textbox')).toHaveClass('custom-input');
    });

    it('should combine custom class with default classes', () => {
      render(Input, { props: { class: 'my-input' } });
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('input');
      expect(input).toHaveClass('my-input');
    });
  });
});

