import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// A data router (rather than <BrowserRouter>) so pages can use useBlocker to ask
// before leaving with unsaved changes. App still declares its own <Routes>.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)
