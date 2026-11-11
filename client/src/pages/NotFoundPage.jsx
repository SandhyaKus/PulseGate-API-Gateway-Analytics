import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center p-6">
      <div className="max-w-md space-y-4">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">404 - Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested resource does not exist in PulseGate.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}

