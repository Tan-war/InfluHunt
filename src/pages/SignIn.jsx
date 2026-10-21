import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { btnPrimary, inputClass } from '../components/ui.js'
import { signIn } from '../lib/storage.js'

function validate({ email, password }) {
  const errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Please enter a valid email.'
  if (password.length < 6) errors.password = 'Password must be at least 6 characters.'
  return errors
}

export default function SignIn() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validate(values) : {}

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
    if (Object.keys(validate(values)).length > 0) return
    // No real account check yet: any valid email and 6+ character password works.
    signIn(values.email.trim())
    navigate('/find')
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5 rounded-card bg-white p-6">
        <div>
          <label htmlFor="signin-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="signin-email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
            className={inputClass(errors.email)}
          />
          {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="signin-password" className="mb-1.5 block text-sm font-medium">
            Password
          </label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={(e) => setValues({ ...values, password: e.target.value })}
            className={inputClass(errors.password)}
          />
          {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
        </div>
        <button type="submit" className={`${btnPrimary} w-full`}>
          Sign in
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link to="/find" className="text-accent transition-opacity duration-200 ease-in-out hover:opacity-80">
          Continue as guest
        </Link>
      </p>
    </div>
  )
}
