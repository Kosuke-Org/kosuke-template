'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface TechCardProps {
  name: string;
  description: string;
  logoPath: string;
  url: string;
  className?: string;
}

export function TechCard({ name, description, logoPath, url, className = '' }: TechCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={className}>
      <Card
        className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 cursor-pointer group"
        onClick={handleClick}
      >
        <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {!imageError ? (
              <Image
                src={logoPath}
                alt={`${name} logo`}
                width={64}
                height={64}
                className="object-contain transition-transform duration-300 group-hover:scale-110"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-2xl font-bold text-muted-foreground">
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>

          <div className="flex items-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
            <ExternalLink className="w-3 h-3 mr-1" />
            <span>Learn more</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface TechLogoProps {
  name: string;
  logoPath: string;
  url: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TechLogo({ name, logoPath, url, size = 'md', className = '' }: TechLogoProps) {
  const [imageError, setImageError] = useState(false);

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
          src={logoPath}
          alt={`${name} logo`}
          width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
          height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
          className="object-contain w-full h-full hover:drop-shadow-lg transition-all duration-300"
          onError={() => setImageError(true)}
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
