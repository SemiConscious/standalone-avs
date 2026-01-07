/**
 * Tests for Select Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Select from '../Select.svelte';

describe('Select Component', () => {
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('Rendering', () => {
    it('should render with options', () => {
      render(Select, { props: { options: defaultOptions } });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(Select, { props: { options: defaultOptions } });
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('should render option labels correctly', () => {
      render(Select, { props: { options: defaultOptions } });
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
      expect(screen.getByText('Option 3')).toBeInTheDocument();
    });
  });

  describe('Label', () => {
    it('should render without label by default', () => {
      const { container } = render(Select, { props: { options: defaultOptions } });
      expect(container.querySelector('label')).not.toBeInTheDocument();
    });

    it('should render with label when provided', () => {
      render(Select, { props: { options: defaultOptions, label: 'Choose an option' } });
      expect(screen.getByText('Choose an option')).toBeInTheDocument();
    });

    it('should associate label with select via for attribute', () => {
      render(Select, { props: { options: defaultOptions, label: 'My Label', id: 'my-select' } });
      const label = screen.getByText('My Label');
      expect(label).toHaveAttribute('for', 'my-select');
    });
  });

  describe('Error State', () => {
    it('should render without error by default', () => {
      const { container } = render(Select, { props: { options: defaultOptions } });
      expect(container.querySelector('.text-error')).not.toBeInTheDocument();
    });

    it('should render error message when error is provided', () => {
      render(Select, { props: { options: defaultOptions, error: 'This field is required' } });
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error border class when error is provided', () => {
      render(Select, { props: { options: defaultOptions, error: 'Error' } });
      expect(screen.getByRole('combobox')).toHaveClass('border-error');
    });
  });

  describe('Hint', () => {
    it('should render without hint by default', () => {
      const { container } = render(Select, { props: { options: defaultOptions } });
      expect(container.querySelector('.text-text-secondary')).not.toBeInTheDocument();
    });

    it('should render hint when provided', () => {
      render(Select, { props: { options: defaultOptions, hint: 'Select your preferred option' } });
      expect(screen.getByText('Select your preferred option')).toBeInTheDocument();
    });

    it('should not render hint when error is present', () => {
      render(Select, { 
        props: { 
          options: defaultOptions, 
          hint: 'Hint text', 
          error: 'Error text' 
        } 
      });
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
      expect(screen.getByText('Error text')).toBeInTheDocument();
    });
  });

  describe('Disabled Options', () => {
    it('should render disabled option when specified', () => {
      const optionsWithDisabled = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2', disabled: true },
      ];
      render(Select, { props: { options: optionsWithDisabled } });
      
      const option2 = screen.getByText('Option 2');
      expect(option2).toBeDisabled();
    });
  });

  describe('Value Selection', () => {
    it('should change value on selection', async () => {
      render(Select, { props: { options: defaultOptions } });
      const select = screen.getByRole('combobox');
      
      await fireEvent.change(select, { target: { value: 'option2' } });
      expect(select).toHaveValue('option2');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom class', () => {
      render(Select, { props: { options: defaultOptions, class: 'custom-select' } });
      expect(screen.getByRole('combobox')).toHaveClass('custom-select');
    });
  });

  describe('ID Generation', () => {
    it('should use provided id', () => {
      render(Select, { props: { options: defaultOptions, id: 'my-custom-id' } });
      expect(screen.getByRole('combobox')).toHaveAttribute('id', 'my-custom-id');
    });

    it('should generate id when not provided', () => {
      render(Select, { props: { options: defaultOptions } });
      const select = screen.getByRole('combobox');
      expect(select.id).toMatch(/^select-[a-z0-9]+$/);
    });
  });
});

