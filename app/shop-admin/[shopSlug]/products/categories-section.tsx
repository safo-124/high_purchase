"use client"

import { useState } from "react"
import { CategoryData } from "../../actions"

interface CategoriesSectionProps {
  categories: CategoryData[]
  shopSlug: string
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="glass-card rounded-2xl mb-8 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/15 border border-violet-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Categories</h3>
            <p className="text-sm text-slate-400">
              {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} • Managed by business admin
            </p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-white/5 p-6">
          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || "#6366f1" }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{cat.name}</p>
                    <p className="text-xs text-slate-400">
                      {cat.productCount} product{cat.productCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {cat.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{cat.description}</p>
                )}
              </div>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm">
                No categories available. Contact your business admin to create categories.
              </p>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 text-center">
              Categories are managed at the business level by your business admin
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

