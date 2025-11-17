'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';
import Image from 'next/image';

import { motion } from 'framer-motion';

interface TechLogoProps {
  name: string;
  logoPath: {
    light: string;
    dark: string;
  };
  url: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TechLogo({ name, logoPath, url, size = 'md', className = '' }: TechLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, systemTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the current theme, considering system preference
  const currentTheme = mounted ? (theme === 'system' ? systemTheme : theme) : 'light';
  const logoSrc = currentTheme === 'dark' ? logoPath.dark : logoPath.light;

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`${sizeClasses[size]} cursor-pointer transition-all duration-300 ${className}`}
      onClick={handleClick}
      title={`Visit ${name} documentation`}
    >
      {!imageError ? (
        <Image
          src={logoSrc}
          alt={`${name} logo`}
          width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
          height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
          className="h-full w-full object-contain transition-all duration-300 hover:drop-shadow-lg"
          onError={() => setImageError(true)}
          priority
        />
      ) : (
        <div
          className={`${sizeClasses[size]} bg-muted hover:bg-muted/80 flex items-center justify-center rounded-lg transition-colors`}
        >
          <span className="text-muted-foreground text-sm font-bold">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
