import CustomerLayout from '../../layouts/CustomerLayout.jsx';

// Route group: the parentheses keep `(customer)` out of the URL, so these pages
// live at /, /hotels, /checkout ... while still sharing the header/footer shell.
export default function Layout({ children }) {
  return <CustomerLayout>{children}</CustomerLayout>;
}
