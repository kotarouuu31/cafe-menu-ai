'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface ArrayInputProps {
  label: string
  placeholder: string
  items: string[]
  onAdd: (item: string) => void
  onRemove: (index: number) => void
  colorScheme?: 'blue' | 'red' | 'green' | 'purple'
}

export function ArrayInput({ 
  label, 
  placeholder, 
  items, 
  onAdd, 
  onRemove, 
  colorScheme = 'blue' 
}: ArrayInputProps) {
  const [inputValue, setInputValue] = useState('')

  const colorClasses = {
    blue: {
      button: 'bg-blue-600 hover:bg-blue-700',
      tag: 'bg-blue-100 text-blue-800',
      tagHover: 'hover:bg-blue-200'
    },
    red: {
      button: 'bg-red-600 hover:bg-red-700',
      tag: 'bg-red-100 text-red-800',
      tagHover: 'hover:bg-red-200'
    },
    green: {
      button: 'bg-green-600 hover:bg-green-700',
      tag: 'bg-green-100 text-green-800',
      tagHover: 'hover:bg-green-200'
    },
    purple: {
      button: 'bg-purple-600 hover:bg-purple-700',
      tag: 'bg-purple-100 text-purple-800',
      tagHover: 'hover:bg-purple-200'
    }
  }

  const colors = colorClasses[colorScheme]

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{label}</h2>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
        />
        <button
          type="button"
          onClick={handleAdd}
          className={`px-4 py-2 text-white rounded-lg transition-colors ${colors.button}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${colors.tag}`}
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className={`rounded-full p-0.5 ${colors.tagHover}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

export function FormField({ label, required, error, children }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

interface LoadingButtonProps {
  loading: boolean
  children: React.ReactNode
  className?: string
  type?: 'button' | 'submit'
  onClick?: () => void
}

export function LoadingButton({ 
  loading, 
  children, 
  className = '', 
  type = 'button',
  onClick 
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? '処理中...' : children}
    </button>
  )
}
