import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base";
  
  const variants = {
    primary: "bg-academic-700 hover:bg-academic-800 text-white shadow-md shadow-academic-700/20 focus:ring-academic-500",
    secondary: "bg-white hover:bg-academic-50 text-academic-700 border border-academic-200 shadow-sm focus:ring-academic-500",
    outline: "bg-transparent border border-academic-300 text-academic-600 hover:border-academic-500 hover:text-academic-800 focus:ring-academic-500"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
      {children}
    </button>
  );
};