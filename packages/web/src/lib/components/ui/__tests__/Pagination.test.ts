/**
 * Tests for Pagination Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import Pagination from '../Pagination.svelte';

describe('Pagination Component', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    onPageChange: vi.fn(),
  };

  describe('Rendering', () => {
    it('should render pagination navigation', () => {
      render(Pagination, { props: defaultProps });
      expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
    });

    it('should render previous and next buttons', () => {
      const { container } = render(Pagination, { props: defaultProps });
      // Buttons use aria-label which might not be accessible via role query with custom components
      expect(container.querySelector('button[aria-label="Previous page"]')).toBeInTheDocument();
      expect(container.querySelector('button[aria-label="Next page"]')).toBeInTheDocument();
    });

    it('should render page numbers by default', () => {
      render(Pagination, { props: defaultProps });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Page Numbers', () => {
    it('should show limited page numbers based on maxVisiblePages', () => {
      render(Pagination, { props: { ...defaultProps, maxVisiblePages: 3 } });
      const buttons = screen.getAllByRole('button').filter(
        (btn) => !btn.getAttribute('aria-label')?.includes('page')
      );
      expect(buttons.length).toBeLessThanOrEqual(5); // 3 pages + prev + next
    });

    it('should show all pages when totalPages <= maxVisiblePages', () => {
      render(Pagination, { props: { ...defaultProps, totalPages: 3, maxVisiblePages: 5 } });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should hide page numbers when showPageNumbers is false', () => {
      render(Pagination, { props: { ...defaultProps, showPageNumbers: false } });
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.getByText(/page 1 of 10/i)).toBeInTheDocument();
    });
  });

  describe('Current Page Indication', () => {
    it('should mark current page with aria-current', () => {
      render(Pagination, { props: { ...defaultProps, currentPage: 3 } });
      const currentPageButton = screen.getByText('3');
      expect(currentPageButton).toHaveAttribute('aria-current', 'page');
    });

    it('should apply active styling to current page', () => {
      render(Pagination, { props: { ...defaultProps, currentPage: 2 } });
      const currentPageButton = screen.getByText('2');
      expect(currentPageButton).toHaveClass('bg-accent');
    });
  });

  describe('Navigation', () => {
    it('should call onPageChange when page button is clicked', async () => {
      const onPageChange = vi.fn();
      render(Pagination, { props: { ...defaultProps, onPageChange } });
      
      await fireEvent.click(screen.getByText('2'));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with next page when next is clicked', async () => {
      const onPageChange = vi.fn();
      const { container } = render(Pagination, { props: { ...defaultProps, onPageChange, currentPage: 1 } });
      
      const nextButton = container.querySelector('button[aria-label="Next page"]');
      await fireEvent.click(nextButton!);
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange with previous page when previous is clicked', async () => {
      const onPageChange = vi.fn();
      const { container } = render(Pagination, { props: { ...defaultProps, onPageChange, currentPage: 5 } });
      
      const prevButton = container.querySelector('button[aria-label="Previous page"]');
      await fireEvent.click(prevButton!);
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('should not call onPageChange when clicking current page', async () => {
      const onPageChange = vi.fn();
      render(Pagination, { props: { ...defaultProps, onPageChange, currentPage: 3 } });
      
      await fireEvent.click(screen.getByText('3'));
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Disabled States', () => {
    it('should disable previous button on first page', () => {
      const { container } = render(Pagination, { props: { ...defaultProps, currentPage: 1 } });
      const prevButton = container.querySelector('button[aria-label="Previous page"]');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      const { container } = render(Pagination, { props: { ...defaultProps, currentPage: 10, totalPages: 10 } });
      const nextButton = container.querySelector('button[aria-label="Next page"]');
      expect(nextButton).toBeDisabled();
    });

    it('should enable previous button when not on first page', () => {
      const { container } = render(Pagination, { props: { ...defaultProps, currentPage: 5 } });
      const prevButton = container.querySelector('button[aria-label="Previous page"]');
      expect(prevButton).not.toBeDisabled();
    });

    it('should enable next button when not on last page', () => {
      const { container } = render(Pagination, { props: { ...defaultProps, currentPage: 5, totalPages: 10 } });
      const nextButton = container.querySelector('button[aria-label="Next page"]');
      expect(nextButton).not.toBeDisabled();
    });
  });

  describe('Page Range Calculation', () => {
    it('should center current page in visible range when possible', () => {
      render(Pagination, { props: { ...defaultProps, currentPage: 5, maxVisiblePages: 5 } });
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('should start from page 1 when current page is near start', () => {
      render(Pagination, { props: { ...defaultProps, currentPage: 2, maxVisiblePages: 5 } });
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should end at last page when current page is near end', () => {
      render(Pagination, { props: { ...defaultProps, currentPage: 9, totalPages: 10, maxVisiblePages: 5 } });
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
    });
  });
});

