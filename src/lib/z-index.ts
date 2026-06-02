/** App-wide stacking order — modals must sit above portaled/fixed dropdowns. */
export const Z_INDEX = {
  /** Portaled menus — above nav/sidebar, below modals */
  dropdown: 200,
  sticky: 100,
  modal: 10_000,
} as const;
