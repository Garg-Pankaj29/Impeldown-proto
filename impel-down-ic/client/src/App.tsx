// Main App shell — wraps router with BrowserRouter
// Follows docs/architecture.md

import { BrowserRouter } from 'react-router-dom';
import AppRouter from './app/router';

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
