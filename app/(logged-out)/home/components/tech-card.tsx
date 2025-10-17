'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

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
          className="object-contain w-full h-full hover:drop-shadow-lg transition-all duration-300"
          onError={() => setImageError(true)}
          priority
        />
      ) : (
        <div
          className={`${sizeClasses[size]} bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors`}
        >
          <span className="text-sm font-bold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
